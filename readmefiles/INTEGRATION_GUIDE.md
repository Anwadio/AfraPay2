# AfraPay Frontend-Backend Integration

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Make sure your `.env` file is configured with the correct values (already done)

4. Start the backend server:

```bash
npm start
```

The backend will run on `http://localhost:5000`

### 2. Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies (if not already done):

```bash
npm install
```

3. Make sure your `.env` file is configured (already created)

4. Start the frontend development server:

```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Integration Features

### ✅ Implemented

1. **API Service Layer** (`frontend/src/services/api.js`):
   - Axios-based HTTP client with interceptors
   - Automatic token management
   - Error handling and retry logic
   - CORS support with credentials

2. **Authentication Integration**:
   - Login component calls backend `/auth/login` endpoint
   - Register component calls backend `/auth/register` endpoint
   - Session management with JWT tokens
   - Automatic token refresh

3. **Error Handling**:
   - API response interceptors for common error handling
   - Toast notifications for user feedback
   - MFA support for login flow

4. **Environment Configuration**:
   - Frontend `.env` with API base URL
   - Backend `.env` with CORS origins

### 🔄 API Endpoints Available

- **POST** `/api/v1/auth/register` - User registration
- **POST** `/api/v1/auth/login` - User login (with MFA support)
- **POST** `/api/v1/auth/logout` - User logout
- **POST** `/api/v1/auth/refresh-token` - Token refresh
- **POST** `/api/v1/auth/verify-email/:token` - Email verification
- **GET** `/api/v1/auth/me` - Get current user

## Testing the Integration

1. **Start both servers** (backend on :5000, frontend on :3000)

2. **Test Registration**:
   - Go to `http://localhost:3000/auth/register`
   - Fill out the registration form
   - Check backend logs for API calls
   - Check browser Network tab for HTTP requests

3. **Test Login**:
   - Go to `http://localhost:3000/auth/login`
   - Try logging in with created account
   - Check that JWT tokens are stored in localStorage
   - Check that user is redirected to dashboard

4. **Test Authentication Flow**:
   - Try accessing protected routes
   - Test token expiration and refresh
   - Test logout functionality

## Troubleshooting

### CORS Issues

If you see CORS errors, make sure:

- Backend `.env` has `CORS_ORIGIN=http://localhost:3000`
- Frontend `.env` has `REACT_APP_API_BASE_URL=http://localhost:5000/api/v1`

### Network Errors

- Check that both servers are running
- Verify the API base URL in frontend `.env`
- Check browser Developer Tools Network tab

### Authentication Issues

- Check that JWT secrets are set in backend `.env`
- Verify tokens are being stored in localStorage
- Check API response format matches expected structure

## Next Steps

1. **Enhanced Error Handling**: Add more specific error messages
2. **MFA Implementation**: Create dedicated MFA verification page
3. **Email Verification**: Implement email verification flow
4. **Password Recovery**: Add forgot/reset password functionality
5. **User Profile**: Connect profile pages to backend APIs
