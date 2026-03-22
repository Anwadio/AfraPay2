# Admin Setup Instructions

## 🚀 Creating Your First Admin User

Before you can use the AdminDashboard, you need to create the first admin user. Follow these steps:

### Prerequisites

1. Backend server is configured and Appwrite is connected
2. `.env` file is set up with Appwrite credentials

### Step 1: Configure Admin Credentials (Optional)

You can customize the admin user by setting these environment variables in your `.env` file:

```bash
# Admin User Setup
ADMIN_EMAIL=admin@afrapayafrica.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_NAME=AfraPay Administrator
```

### Step 2: Run the Setup Script

```bash
# Navigate to backend directory
cd backend

# Run the admin setup script
node diagnostics/setup-admin-user.js
```

### Expected Output

```
🚀 Setting up first admin user...

📧 Admin Email: admin@afrapayafrica.com
👤 Admin Name: AfraPay Administrator
🔐 Password: **************

🔨 Creating admin user...
✅ User created successfully with ID: 647a8b2c3d4e5f6789abcdef
🏷️  Setting admin permissions...
✅ Admin permissions granted
📧 Verifying email...
✅ Email verified

🎉 Admin user setup completed successfully!

📋 Login Credentials:
   Email: admin@afrapayafrica.com
   Password: YourSecurePassword123!
   Roles: admin, super_admin, user

🌐 You can now login to the AdminDashboard at: http://localhost:3000
```

### Step 3: Login to AdminDashboard

1. Open AdminDashboard at `http://localhost:3000`
2. Use the email and password from the script output
3. You now have full admin access!

## 🔧 Troubleshooting

### Error: 401 Unauthorized

- Check your `APPWRITE_API_KEY` in `.env` file
- Ensure your API key has the correct permissions

### Error: 404 Not Found

- Verify `APPWRITE_PROJECT_ID` and `APPWRITE_ENDPOINT` in `.env`
- Check that your Appwrite server is running

### Error: 409 Conflict (User already exists)

- The script will automatically promote existing users to admin
- Or change the `ADMIN_EMAIL` to a different email address

### Script says "Admin user already exists"

- If they already have admin role: You're all set! ✅
- If they don't have admin role: The script will promote them automatically

## 🛡️ Security Notes

1. **Change Default Password**: Always use a strong password in production
2. **Secure Email**: Use your actual admin email address
3. **Environment Variables**: Keep your `.env` file secure and never commit it
4. **Admin Access**: This creates a `super_admin` user with full system access

## 🔄 Re-running the Script

The script is safe to run multiple times:

- If admin user exists with admin role → No changes made
- If admin user exists without admin role → Promotes to admin
- If no admin user exists → Creates new admin user

---

**Next Steps**: After creating your admin user, you can login to the AdminDashboard and start managing your AfraPay platform!
