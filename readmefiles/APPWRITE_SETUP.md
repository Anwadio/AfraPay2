/\*\*

- Appwrite Setup Instructions
- Complete guide for setting up Appwrite with AfraPay backend and frontend
  \*/

# Appwrite Integration Setup Guide

## Prerequisites

- Docker installed on your system
- Node.js 18+ installed
- Appwrite CLI (optional but recommended)

## 1. Start Appwrite Server

### Using Docker Compose (Recommended)

```bash
# Create appwrite directory
mkdir appwrite && cd appwrite

# Download Appwrite
curl -o docker-compose.yml https://appwrite.io/install/compose

# Start Appwrite
docker-compose up -d
```

### Access Appwrite Console

- Open http://localhost:8080 in your browser
- Create your admin account
- Create a new project called "afrapay"

## 2. Configure Appwrite Project

### Project Settings

1. Go to Settings → General
2. Set Project ID: `afrapay`
3. Add your domains:
   - `http://localhost:3000` (Frontend development)
   - `http://localhost:5000` (Backend API)
   - Add production domains when ready

### Authentication Settings

1. Go to Auth → Settings
2. Enable Email/Password authentication
3. Set session length to 900 seconds (15 minutes)
4. Enable email verification
5. Configure password requirements:
   - Minimum length: 8 characters
   - Require uppercase, lowercase, numbers

### Create Database

1. Go to Databases
2. Create database with ID: `afrapay-db`
3. Create the following collections:

#### Users Collection (`users`)

```javascript
// Attributes
- userId: string, 36 chars, required
- firstName: string, 50 chars, required
- lastName: string, 50 chars, required
- dateOfBirth: datetime
- country: string, 3 chars (ISO code)
- kycLevel: integer, default: 0
- kycStatus: enum ['pending', 'under_review', 'verified', 'rejected']
- accountStatus: enum ['active', 'suspended', 'closed']
- emailVerified: boolean, default: false
- phoneVerified: boolean, default: false
- mfaEnabled: boolean, default: true
- preferences: string, 2000 chars (JSON)
```

#### Transactions Collection (`transactions`)

```javascript
// Attributes
- userId: string, 36 chars, required
- type: enum ['transfer', 'payment', 'withdrawal', 'deposit']
- amount: float, required
- currency: string, 3 chars, default: 'USD'
- status: enum ['pending', 'completed', 'failed', 'cancelled']
- description: string, 255 chars
- metadata: string, 1000 chars (JSON)
```

#### Wallets Collection (`wallets`)

```javascript
// Attributes
- userId: string, 36 chars, required, unique
- balance: float, default: 0.0
- currency: string, 3 chars, default: 'USD'
- status: enum ['active', 'frozen', 'closed']
- lastUpdated: datetime
```

### Create Storage Buckets

1. Go to Storage
2. Create buckets:
   - `avatars` (Max file size: 2MB, Allowed file types: jpg, png, gif)
   - `documents` (Max file size: 10MB, Allowed file types: jpg, png, pdf)

### Set Permissions

For each collection, set these permissions:

- Create: `users`
- Read: `users`
- Update: `users`
- Delete: `users`

## 3. Backend Configuration

### Environment Variables (.env)

```bash
# Appwrite Configuration
APPWRITE_ENDPOINT=http://localhost:8080/v1
APPWRITE_PROJECT_ID=afrapay
APPWRITE_API_KEY=your_api_key_here
APPWRITE_DATABASE_ID=afrapay-db

# Collection IDs
USERS_COLLECTION_ID=users
TRANSACTIONS_COLLECTION_ID=transactions
WALLETS_COLLECTION_ID=wallets
DOCUMENTS_COLLECTION_ID=kyc_documents

# Storage Bucket IDs
AVATARS_BUCKET_ID=avatars
DOCUMENTS_BUCKET_ID=documents
```

### Get API Key

1. Go to Settings → API Keys in Appwrite console
2. Create new API key with these scopes:
   - `users.read`
   - `users.write`
   - `databases.read`
   - `databases.write`
   - `files.read`
   - `files.write`

## 4. Frontend Configuration

### Environment Variables (.env)

```bash
# Appwrite Configuration
REACT_APP_APPWRITE_ENDPOINT=http://localhost:8080/v1
REACT_APP_APPWRITE_PROJECT_ID=afrapay
REACT_APP_APPWRITE_DATABASE_ID=afrapay-db

# Collection IDs
REACT_APP_APPWRITE_USERS_COLLECTION_ID=users
REACT_APP_APPWRITE_TRANSACTIONS_COLLECTION_ID=transactions
REACT_APP_APPWRITE_WALLETS_COLLECTION_ID=wallets
REACT_APP_APPWRITE_DOCUMENTS_COLLECTION_ID=kyc_documents

# Storage Buckets
REACT_APP_APPWRITE_AVATARS_BUCKET_ID=avatars
REACT_APP_APPWRITE_DOCUMENTS_BUCKET_ID=documents
```

## 5. Installation & Setup

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Appwrite configuration
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Appwrite configuration
npm start
```

## 6. Testing the Integration

### Test Registration Flow

1. Start both backend and frontend
2. Navigate to http://localhost:3000/auth/register
3. Create a new user account
4. Check Appwrite console to verify user creation
5. Verify email verification flow

### Test Login Flow

1. Navigate to http://localhost:3000/auth/login
2. Login with created credentials
3. Check session in Appwrite console
4. Verify dashboard access

### Test Data Synchronization

1. Update user profile in frontend
2. Check if data is synced in Appwrite database
3. Test file upload functionality
4. Verify permissions work correctly

## 7. Production Configuration

### Security Settings

1. Update CORS origins to production domains
2. Use strong API keys with minimal required permissions
3. Enable rate limiting in Appwrite
4. Set up SSL certificates
5. Configure backup strategies

### Performance Optimization

1. Enable caching where appropriate
2. Optimize database queries
3. Set up CDN for file storage
4. Monitor performance metrics

## 8. Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure domains are added to project settings
2. **Authentication Failures**: Check API keys and permissions
3. **Database Errors**: Verify collection schemas match code
4. **File Upload Issues**: Check bucket permissions and file size limits

### Debug Mode

Enable debug mode in development:

```bash
# Backend
LOG_LEVEL=debug

# Frontend
REACT_APP_ENABLE_DEBUG=true
```

## 9. Advanced Features

### Real-time Subscriptions

Appwrite supports real-time subscriptions for live updates:

```javascript
// Example: Subscribe to user document changes
client.subscribe(
  "databases.afrapay-db.collections.users.documents",
  (response) => {
    console.log("User data updated:", response);
  },
);
```

### Custom Functions

Create Appwrite functions for complex business logic:

- Transaction processing
- Email notifications
- Data validation
- Third-party integrations

## Support & Documentation

- Appwrite Documentation: https://appwrite.io/docs
- AfraPay Integration Guide: See `/readmefiles/` directory
- Community Support: https://appwrite.io/discord
