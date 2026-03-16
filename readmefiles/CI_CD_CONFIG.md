# CI/CD Pipeline Configuration

## GitHub Actions Workflows

### Frontend CI Pipeline (.github/workflows/ci-frontend.yml)

```yaml
name: Frontend CI

on:
  push:
    branches: [main, develop]
    paths: ["frontend/**"]
  pull_request:
    branches: [main, develop]
    paths: ["frontend/**"]

env:
  NODE_VERSION: "18.x"
  CACHE_KEY: node-modules-${{ hashFiles('frontend/package-lock.json') }}

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run ESLint
        working-directory: ./frontend
        run: npm run lint

      - name: Run Prettier check
        working-directory: ./frontend
        run: npm run format:check

      - name: Run unit tests
        working-directory: ./frontend
        run: npm run test -- --coverage --watchAll=false

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          directory: ./frontend/coverage

      - name: Build application
        working-directory: ./frontend
        run: npm run build

      - name: Run security audit
        working-directory: ./frontend
        run: npm audit --audit-level moderate

      - name: Cache build artifacts
        uses: actions/cache@v3
        with:
          path: frontend/build
          key: frontend-build-${{ github.sha }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Start application
        working-directory: ./frontend
        run: |
          npm run build
          npm run serve &
          npx wait-on http://localhost:3000

      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          working-directory: frontend
          start: npm run serve
          wait-on: "http://localhost:3000"

      - name: Upload Cypress videos
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-videos
          path: frontend/cypress/videos
```

### Backend CI Pipeline (.github/workflows/ci-backend.yml)

```yaml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths: ["backend/**"]
  pull_request:
    branches: [main, develop]
    paths: ["backend/**"]

env:
  NODE_VERSION: "18.x"
  REDIS_VERSION: "7"

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:${{ env.REDIS_VERSION }}
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run ESLint
        working-directory: ./backend
        run: npm run lint

      - name: Run security audit
        working-directory: ./backend
        run: npm audit --audit-level moderate

      - name: Run unit tests
        working-directory: ./backend
        run: npm run test:unit
        env:
          NODE_ENV: test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        working-directory: ./backend
        run: npm run test:integration
        env:
          NODE_ENV: test
          REDIS_URL: redis://localhost:6379

      - name: Generate coverage report
        working-directory: ./backend
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage

      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: "afrapay-backend"
          path: "./backend"
          format: "JSON"

      - name: Upload OWASP report
        uses: actions/upload-artifact@v3
        with:
          name: dependency-check-report
          path: reports/

  security-scan:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Snyk Security Test
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --file=backend/package.json

      - name: Run Semgrep SAST
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
```

### Staging Deployment (.github/workflows/cd-staging.yml)

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_run:
    workflows: ["Frontend CI", "Backend CI"]
    branches: [develop]
    types: [completed]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  deploy-staging:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:staging
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push Backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:staging
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to Staging
        uses: azure/k8s-deploy@v1
        with:
          manifests: |
            infrastructure/kubernetes/frontend/deployment.yaml
            infrastructure/kubernetes/backend/deployment.yaml
          images: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ github.sha }}
          kubectl-version: "latest"

      - name: Run Staging Health Check
        run: |
          echo "Waiting for deployment to be ready..."
          sleep 60
          curl -f ${{ secrets.STAGING_URL }}/health || exit 1

      - name: Run Smoke Tests
        working-directory: ./tests/e2e
        run: |
          npm ci
          npm run test:staging
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}

      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: "#deployments"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

### Production Deployment (.github/workflows/cd-production.yml)

```yaml
name: Deploy to Production

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:
    inputs:
      version:
        description: "Version to deploy"
        required: true
        type: string

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Container Security Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:latest
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: "trivy-results.sarif"

  deploy-production:
    runs-on: ubuntu-latest
    needs: security-scan
    environment:
      name: production
      url: https://app.afrapay.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Get version
        id: version
        run: |
          if [[ "${{ github.event_name }}" == "push" ]]; then
            echo "version=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT
          else
            echo "version=${{ github.event.inputs.version }}" >> $GITHUB_OUTPUT
          fi

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ steps.version.outputs.version }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:latest
          build-args: |
            NODE_ENV=production

      - name: Build and push Backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ steps.version.outputs.version }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:latest
          build-args: |
            NODE_ENV=production

      - name: Deploy to Production (Blue-Green)
        run: |
          # Blue-Green deployment script
          ./scripts/deployment/deploy.sh production ${{ steps.version.outputs.version }}

      - name: Run Production Health Check
        run: |
          echo "Running comprehensive health checks..."
          ./scripts/deployment/health-check.sh production

      - name: Run Production Smoke Tests
        working-directory: ./tests/e2e
        run: |
          npm ci
          npm run test:production
        env:
          BASE_URL: ${{ secrets.PRODUCTION_URL }}

      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.version.outputs.version }}
          release_name: Release ${{ steps.version.outputs.version }}
          draft: false
          prerelease: false

      - name: Notify Success
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              text: "✅ Production Deployment Successful",
              attachments: [{
                color: "good",
                fields: [{
                  title: "Version",
                  value: "${{ steps.version.outputs.version }}",
                  short: true
                }, {
                  title: "Environment", 
                  value: "Production",
                  short: true
                }]
              }]
            }
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Security Scanning Pipeline (.github/workflows/security-scan.yml)

```yaml
name: Security Scan

on:
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM
  workflow_dispatch:

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Snyk Security Test
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --all-projects --severity-threshold=medium

      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: "afrapay"
          path: "."
          format: "ALL"

  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

      - name: Run Semgrep SAST
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
            p/nodejs

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
          extra_args: --debug --only-verified
```

## Environment Configuration

### Development Environment (.env.example)

```bash
# Application
NODE_ENV=development
PORT=3000
API_PORT=5000

# Database
DATABASE_URL=your_appwrite_database_url
DATABASE_PROJECT_ID=your_project_id
DATABASE_API_KEY=your_api_key

# Authentication
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your_32_char_encryption_key_here
HASH_SALT_ROUNDS=12

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# External Services
PAYMENT_GATEWAY_API_KEY=your_payment_gateway_key
PAYMENT_GATEWAY_SECRET=your_payment_gateway_secret
SMS_API_KEY=your_sms_provider_key
EMAIL_API_KEY=your_email_provider_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key

# Security
CSRF_SECRET=your_csrf_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Features
ENABLE_MFA=true
ENABLE_FRAUD_DETECTION=true
ENABLE_KYC=true
MAX_TRANSACTION_AMOUNT=10000
```

### Docker Configuration

#### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy app source
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "src/server.js"]
```

## Monitoring and Observability

### Prometheus Configuration

```yaml
# infrastructure/monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: "afrapay-backend"
    static_configs:
      - targets: ["backend:5000"]
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: "afrapay-frontend"
    static_configs:
      - targets: ["frontend:80"]
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: "redis"
    static_configs:
      - targets: ["redis:6379"]

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

This enterprise-ready folder structure provides a solid foundation for scaling AfraPay from startup to enterprise level with proper separation of concerns, security, monitoring, and automated deployment pipelines.
