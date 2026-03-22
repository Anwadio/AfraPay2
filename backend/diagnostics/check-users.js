/**
 * Diagnostic script to check users in Appwrite database
 */

const { Client, Users } = require("node-appwrite");
const config = require("../src/config/environment");

// Initialize client
const client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const users = new Users(client);

async function checkUsers() {
  try {
    console.log("🔍 Checking users in Appwrite database...");
    console.log("📦 Project ID:", config.database.appwrite.projectId);
    console.log("🌐 Endpoint:", config.database.appwrite.endpoint);

    // Try to list all users
    const userList = await users.list();

    console.log("\n📊 User Statistics:");
    console.log("Total users found:", userList.total);
    console.log("Users in response:", userList.users.length);

    if (userList.users.length > 0) {
      console.log("\n👥 User Details:");
      userList.users.forEach((user, index) => {
        console.log(`\n${index + 1}. User: ${user.email}`);
        console.log(`   - ID: ${user.$id}`);
        console.log(`   - Name: ${user.name || "N/A"}`);
        console.log(`   - Email Verified: ${user.emailVerification}`);
        console.log(`   - Phone Verified: ${user.phoneVerification}`);
        console.log(`   - Status: ${user.status}`);
        console.log(
          `   - Labels: ${JSON.stringify(user.labels || {}, null, 2)}`,
        );
        console.log(`   - Created: ${user.$createdAt}`);
      });
    } else {
      console.log("\n⚠️  No users found in the database");
      console.log("This could mean:");
      console.log("1. Users are in a different project");
      console.log("2. Users haven't been created yet");
      console.log("3. API key doesn't have proper permissions");
    }
  } catch (error) {
    console.error("❌ Error checking users:", error.message);
    console.error("Full error:", error);
  }
}

// Run the check
checkUsers()
  .then(() => {
    console.log("\n✅ User check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
