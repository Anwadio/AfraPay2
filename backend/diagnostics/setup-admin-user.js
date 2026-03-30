/**
 * Admin User Setup Script
 * Creates the first admin user for the AfraPay system
 *
 * Usage: node setup-admin-user.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const { Client, Users, Databases, ID } = require("node-appwrite");
const config = require("../src/config/environment");

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const users = new Users(client);
const databases = new Databases(client);

async function createAdminUser() {
  try {
    console.log("🚀 Setting up first admin user...\n");

    // Get admin details from environment or use defaults
    const adminEmail = process.env.ADMIN_EMAIL || "admin@afrapayafrica.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminPass123!";
    const adminName = process.env.ADMIN_NAME || "AfraPay Administrator";

    console.log(`📧 Admin Email: ${adminEmail}`);
    console.log(`👤 Admin Name: ${adminName}`);
    console.log(`🔐 Password: ${adminPassword.replace(/./g, "*")}`);
    console.log("");

    // Check if admin user already exists
    try {
      const existingUsers = await users.list([`email=${adminEmail}`]);

      if (existingUsers.users && existingUsers.users.length > 0) {
        const existingUser = existingUsers.users[0];
        console.log("⚠️  Admin user already exists!");
        console.log(`   User ID: ${existingUser.$id}`);
        console.log(`   Email: ${existingUser.email}`);

        // Check if they have admin role in the database collection
        try {
          const userProfile = await databases.getDocument(
            config.database.appwrite.databaseId,
            config.database.appwrite.userCollectionId,
            existingUser.$id,
          );

          const hasAdminRole = userProfile.role === "admin";

          if (!hasAdminRole) {
            console.log("🔄 Promoting existing user to admin...");
            await databases.updateDocument(
              config.database.appwrite.databaseId,
              config.database.appwrite.userCollectionId,
              existingUser.$id,
              { role: "admin" },
            );
            console.log("✅ User promoted to admin successfully!");
          } else {
            console.log("✅ User already has admin privileges");
          }

          // Check if user has password hash in preferences (required for login)
          if (!existingUser.prefs?.passwordHash) {
            console.log("🔐 Adding password hash for existing admin user...");
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

            await users.updatePrefs(existingUser.$id, {
              ...(existingUser.prefs || {}),
              passwordHash: hashedPassword,
              adminUpdated: true,
              adminUpdatedAt: new Date().toISOString(),
            });
            console.log("✅ Password hash added - user can now login");
          }
        } catch (profileErr) {
          console.log("📝 Creating admin profile document...");
          await databases.createDocument(
            config.database.appwrite.databaseId,
            config.database.appwrite.userCollectionId,
            existingUser.$id,
            {
              userId: existingUser.$id,
              email: existingUser.email,
              firstName: existingUser.name?.split(" ")[0] || "Admin",
              lastName:
                existingUser.name?.split(" ").slice(1).join(" ") ||
                "Administrator",
              phone: existingUser.phone || "",
              country: "KE", // Default to Kenya
              dateOfBirth: new Date("1990-01-01").toISOString(),
              kycLevel: 3, // Highest KYC level for admin
              accountStatus: "active",
              role: "admin",
              permissions: JSON.stringify([
                "profile:read",
                "profile:update",
                "admin:dashboard",
                "admin:users",
                "admin:transactions",
                "admin:system",
              ]),
              registrationIP: "127.0.0.1",
              deviceFingerprint: "admin-setup-script",
              emailVerified: true,
              phoneVerified: false,
              mfaEnabled: false,
            },
          );
          console.log("✅ Admin profile created successfully!");

          // Also ensure password hash is stored for existing user
          if (!existingUser.prefs?.passwordHash) {
            console.log("🔐 Adding password hash for existing user...");
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

            await users.updatePrefs(existingUser.$id, {
              ...(existingUser.prefs || {}),
              passwordHash: hashedPassword,
              adminCreated: true,
              adminCreatedAt: new Date().toISOString(),
            });
            console.log("✅ Password hash added");
          }
        }

        return existingUser;
      }
    } catch (error) {
      // User doesn't exist, continue with creation
      console.log("👤 No existing admin found, creating new user...");
    }

    // Create new admin user
    console.log("🔨 Creating admin user...");
    const userId = ID.unique();

    const newUser = await users.create(
      userId,
      adminEmail,
      undefined, // phone (optional)
      adminPassword,
      adminName,
    );

    console.log(`✅ User created successfully with ID: ${newUser.$id}`);

    // Store bcrypt password hash in user preferences (required for login)
    console.log("🔐 Storing password hash for authentication...");
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Get current preferences and merge with password hash
    const current = await users.get(newUser.$id);
    await users.updatePrefs(newUser.$id, {
      ...(current.prefs || {}),
      passwordHash: hashedPassword,
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString(),
      adminCreated: true,
    });
    console.log("✅ Password hash stored in preferences");

    // Set admin role labels for tagging (optional but good practice)
    console.log("🏷️  Setting user labels...");
    await users.updateLabels(newUser.$id, ["admin", "user"]);
    console.log("✅ User labels set");

    // Create user profile document with admin role (this is what the auth system uses)
    console.log("📝 Creating admin profile document...");
    const profileDocument = await databases.createDocument(
      config.database.appwrite.databaseId,
      config.database.appwrite.userCollectionId,
      newUser.$id,
      {
        userId: newUser.$id,
        email: adminEmail,
        firstName: adminName.split(" ")[0] || "Admin",
        lastName: adminName.split(" ").slice(1).join(" ") || "Administrator",
        phone: "",
        country: "KE", // Default to Kenya, can be changed later
        dateOfBirth: new Date("1990-01-01").toISOString(),
        kycLevel: 3, // Highest KYC level for admin
        accountStatus: "active",
        role: "admin", // This is the key field that enables admin access
        permissions: JSON.stringify([
          "profile:read",
          "profile:update",
          "admin:dashboard",
          "admin:users",
          "admin:transactions",
          "admin:system",
        ]),
        registrationIP: "127.0.0.1",
        deviceFingerprint: "admin-setup-script",
        emailVerified: true, // Admin email is auto-verified
        phoneVerified: false,
        mfaEnabled: false,
      },
    );
    console.log("✅ Admin profile document created");

    // Verify email
    console.log("📧 Verifying email...");
    await users.updateEmailVerification(newUser.$id, true);
    console.log("✅ Email verified");

    // Enable MFA (optional but recommended)
    try {
      await users.updateMfaRecoveryCodes(newUser.$id, []);
      console.log("🔐 MFA initialized");
    } catch (error) {
      console.log("⚠️  MFA setup skipped (not critical)");
    }

    console.log("\n🎉 Admin user setup completed successfully!\n");
    console.log("📋 Login Credentials:");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log("   Role: admin (full admin access)");
    console.log(
      "\n🌐 You can now login to the AdminDashboard at: http://localhost:3000",
    );

    return newUser;
  } catch (error) {
    console.error("\n❌ Failed to create admin user:", error.message);

    if (error.code === 401) {
      console.error("💡 Check your APPWRITE_API_KEY in .env file");
    } else if (error.code === 404) {
      console.error("💡 Check your APPWRITE_PROJECT_ID and APPWRITE_ENDPOINT");
    } else if (error.code === 409) {
      console.error("💡 User might already exist with this email");
    }

    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  createAdminUser()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

module.exports = { createAdminUser };
