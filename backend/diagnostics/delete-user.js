/**
 * Delete a user by email from Appwrite (both auth and DB collection)
 * Usage: node diagnostics/delete-user.js <email>
 * Example: node diagnostics/delete-user.js anthonywai5522@gmail.com
 */
require("dotenv").config();
const { Client, Databases, Users, Query } = require("node-appwrite");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const users = new Users(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_USER_COLLECTION_ID;

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node diagnostics/delete-user.js <email>");
    process.exit(1);
  }

  console.log(`Deleting user with email: ${email}`);

  // Find user
  const list = await users.list([Query.equal("email", email)]);
  if (list.total === 0) {
    console.log("No Appwrite auth user found for that email.");
  } else {
    const userId = list.users[0].$id;
    console.log("Found auth user:", userId);

    // Delete DB document
    try {
      await db.deleteDocument(databaseId, collectionId, userId);
      console.log("✅ DB document deleted");
    } catch (e) {
      console.log("No DB document (or already deleted):", e.message);
    }

    // Delete auth user
    await users.delete(userId);
    console.log("✅ Appwrite auth user deleted");
  }

  console.log("Done. User can now re-register.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
