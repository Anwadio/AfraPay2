# Project Configuration Files

## Package.json Files

### Root package.json (Workspace Management)

```json
{
  "name": "afrapay",
  "version": "1.0.0",
  "description": "Enterprise-grade fintech payment platform",
  "private": true,
  "workspaces": ["frontend", "backend", "shared"],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && npm start",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build:shared && npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "build:shared": "cd shared && npm run build",
    "test": "npm run test:frontend && npm run test:backend",
    "test:frontend": "cd frontend && npm test",
    "test:backend": "cd backend && npm test",
    "test:e2e": "cd tests/e2e && npm test",
    "lint": "npm run lint:frontend && npm run lint:backend",
    "lint:frontend": "cd frontend && npm run lint",
    "lint:backend": "cd backend && npm run lint",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "clean": "rm -rf node_modules frontend/node_modules backend/node_modules shared/node_modules",
    "setup": "npm install && npm run build:shared",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "security:audit": "npm audit --workspaces",
    "security:fix": "npm audit fix --workspaces"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "prettier": "^3.1.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^18.4.3",
    "@commitlint/config-conventional": "^18.4.3"
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/afrapay.git"
  },
  "author": "AfraPay Team",
  "license": "UNLICENSED"
}
```

### Frontend package.json

```json
{
  "name": "@afrapay/frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "react-query": "^3.39.3",
    "axios": "^1.6.2",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "classnames": "^2.3.2",
    "react-hook-form": "^7.48.2",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.2",
    "react-hot-toast": "^2.4.1",
    "framer-motion": "^10.16.16",
    "qr-code-styling": "^1.6.0-rc.1",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "date-fns": "^2.30.0",
    "js-cookie": "^3.0.5",
    "crypto-js": "^4.2.0",
    "workbox-webpack-plugin": "^7.0.0"
  },
  "devDependencies": {
    "react-scripts": "5.0.1",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/user-event": "^13.5.0",
    "cypress": "^13.6.1",
    "@cypress/react": "^8.0.0",
    "eslint": "^8.55.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.1.0",
    "@craco/craco": "^7.1.0",
    "craco-alias": "^3.0.1",
    "webpack-bundle-analyzer": "^4.10.1"
  },
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test",
    "test:coverage": "craco test --coverage --watchAll=false",
    "test:e2e": "cypress open",
    "test:e2e:headless": "cypress run",
    "eject": "react-scripts eject",
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js",
    "serve": "npx serve -s build -l 3000"
  },
  "eslintConfig": {
    "extends": ["react-app", "react-app/jest", "prettier"],
    "rules": {
      "no-unused-vars": "error",
      "no-console": "warn",
      "prefer-const": "error"
    }
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:5000"
}
```

### Backend package.json

```json
{
  "name": "@afrapay/backend",
  "version": "1.0.0",
  "private": true,
  "description": "AfraPay Backend API",
  "main": "src/server.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "express-slow-down": "^2.0.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "crypto": "^1.0.1",
    "node-appwrite": "^13.0.0",
    "redis": "^4.6.11",
    "bull": "^4.12.2",
    "nodemailer": "^6.9.7",
    "twilio": "^4.19.0",
    "axios": "^1.6.2",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "lodash": "^4.17.21",
    "moment": "^2.29.4",
    "uuid": "^9.0.1",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.32.6",
    "prom-client": "^15.1.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "express-openapi-validator": "^5.1.4"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "nodemon": "^3.0.2",
    "eslint": "^8.55.0",
    "eslint-config-node": "^4.1.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.1.0",
    "@types/jest": "^29.5.8",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0"
  },
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .js",
    "lint:fix": "eslint src --ext .js --fix",
    "format": "prettier --write \"src/**/*.js\"",
    "format:check": "prettier --check \"src/**/*.js\"",
    "build": "echo 'Build completed'",
    "seed": "node src/database/seeders/index.js",
    "migrate": "node src/database/migrations/index.js",
    "security:audit": "npm audit",
    "security:snyk": "npx snyk test"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/src/__tests__/setup.js"],
    "testMatch": ["<rootDir>/src/__tests__/**/*.test.js"],
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/__tests__/**",
      "!src/config/**",
      "!src/server.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Configuration Files

### ESLint Configuration (.eslintrc.js)

```javascript
// Root .eslintrc.js
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
    jest: true,
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "warn",
    "no-unused-vars": "error",
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error",
  },
  overrides: [
    {
      files: ["frontend/**/*.{js,jsx}"],
      extends: ["react-app", "react-app/jest", "prettier"],
      rules: {
        "react/prop-types": "warn",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
    {
      files: ["backend/**/*.js"],
      env: {
        node: true,
      },
      extends: ["eslint:recommended", "prettier"],
      rules: {
        "no-process-exit": "off",
        "global-require": "off",
      },
    },
  ],
};
```

### Prettier Configuration (.prettierrc)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "overrides": [
    {
      "files": "*.json",
      "options": {
        "printWidth": 120
      }
    },
    {
      "files": "*.md",
      "options": {
        "printWidth": 100,
        "proseWrap": "always"
      }
    }
  ]
}
```

### Tailwind Configuration (frontend/tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        secondary: {
          50: "#f8fafc",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          900: "#0f172a",
        },
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        error: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-in": "slideIn 0.3s ease-out",
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
```

### Jest Configuration (backend/jest.config.js)

```javascript
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: [
    "<rootDir>/src/__tests__/**/*.test.js",
    "<rootDir>/src/**/*.test.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/__tests__/**",
    "!src/config/**",
    "!src/server.js",
    "!**/node_modules/**",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@shared/(.*)$": "<rootDir>/../shared/src/$1",
  },
};
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    networks:
      - afrapay-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    networks:
      - afrapay-network
    volumes:
      - ./backend/logs:/app/logs

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - afrapay-network
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infrastructure/docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./infrastructure/docker/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - afrapay-network

volumes:
  redis_data:

networks:
  afrapay-network:
    driver: bridge
```

### Environment Configuration

```bash
# .env.example
# Application Settings
NODE_ENV=development
APP_NAME=AfraPay
APP_VERSION=1.0.0

# Server Configuration
FRONTEND_PORT=3000
BACKEND_PORT=5000
HOST=localhost

# Database Configuration (Appwrite)
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=your_database_id

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_min_32_characters
JWT_REFRESH_SECRET=your_refresh_token_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=your_session_secret

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key
HASH_SALT_ROUNDS=12

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
REDIS_TTL=3600

# External API Keys
PAYMENT_GATEWAY_API_KEY=your_payment_gateway_key
PAYMENT_GATEWAY_SECRET=your_payment_gateway_secret
BANK_API_KEY=your_bank_api_key
MOBILE_MONEY_API_KEY=your_momo_api_key

# Notification Services
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMS_API_KEY=your_sms_provider_key
SMS_API_SECRET=your_sms_provider_secret

# Monitoring & Analytics
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key
PROMETHEUS_PORT=9090

# Security
CORS_ORIGIN=http://localhost:3000
CSRF_SECRET=your_csrf_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf

# Business Logic
MAX_DAILY_TRANSACTION_AMOUNT=10000
MAX_MONTHLY_TRANSACTION_AMOUNT=100000
TRANSACTION_FEE_PERCENTAGE=2.5
MINIMUM_BALANCE=0

# Feature Flags
ENABLE_MFA=true
ENABLE_KYC=true
ENABLE_FRAUD_DETECTION=true
ENABLE_WEBHOOKS=true
ENABLE_NOTIFICATIONS=true

# Compliance
AML_THRESHOLD_AMOUNT=5000
KYC_REQUIRED_AMOUNT=1000
SUSPICIOUS_ACTIVITY_THRESHOLD=5

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
LOG_MAX_FILES=30
LOG_MAX_SIZE=10m
```

This comprehensive configuration setup provides enterprise-grade standards for development, testing, deployment, and monitoring of the AfraPay fintech application.
