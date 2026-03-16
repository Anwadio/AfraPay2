/**
 * Diagnostic: Check collection attributes and attempt a test document creation
 * Run: node diagnostics/check-collection.js
 */
require("dotenv").config();
const { Client, Databases, ID } = require("node-appwrite");
const crypto = require("crypto");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_USER_COLLECTION_ID;

async function main() {
  console.log("=== Collection Attributes ===");
  console.log("Database ID:", databaseId);
  console.log("Collection ID:", collectionId);

  try {
    const attrs = await db.listAttributes(databaseId, collectionId);
    console.log("\nAttributes:");
    attrs.attributes.forEach((a) => {
      console.log(
        `  ${a.key} [${a.type}] required=${a.required} size=${a.size ?? "N/A"} default=${JSON.stringify(a.default ?? null)}`,
      );
    });
  } catch (e) {
    console.error("Failed to list attributes:", e.message);
    return;
  }

  console.log("\n=== Test Document Creation (real-world fingerprint) ===");
  const testId = ID.unique();

  // Use real 60-char truncated SHA256 (the fix)
  const realFingerprint = crypto
    .createHash("sha256")
    .update("Mozilla/5.0 (Windows NT 10.0)::127.0.0.1")
    .digest("hex")
    .substring(0, 60);

  console.log("Fingerprint length:", realFingerprint.length);

  const testDoc = {
    userId: testId,
    email: "diag2@test.com",
    firstName: "Diag",
    lastName: "Test",
    phone: "+254703115359",
    country: "KE",
    dateOfBirth: new Date("2000-01-01").toISOString(),
    kycLevel: 0,
    accountStatus: "active",
    role: "user",
    permissions: JSON.stringify([
      "profile:read",
      "profile:update",
      "wallet:view",
      "payment:send",
      "payment:receive",
      "transaction:view",
    ]),
    registrationIP: "::1",
    deviceFingerprint: realFingerprint,
    emailVerified: false,
    phoneVerified: false,
    mfaEnabled: false,
  };

  console.log("\nTest payload:");
  console.log(JSON.stringify(testDoc, null, 2));

  try {
    const result = await db.createDocument(
      databaseId,
      collectionId,
      testId,
      testDoc,
    );
    console.log("\n✅ Document created successfully:", result.$id);
    // Clean up — delete the test document
    await db.deleteDocument(databaseId, collectionId, testId);
    console.log("✅ Test document deleted (cleanup done)");
  } catch (e) {
    console.error("\n❌ createDocument failed:");
    console.error("  message:", e.message);
    console.error("  code:", e.code);
    console.error("  type:", e.type);
    if (e.response) {
      console.error("  response:", JSON.stringify(e.response, null, 2));
    }
  }
}

main().catch(console.error);
