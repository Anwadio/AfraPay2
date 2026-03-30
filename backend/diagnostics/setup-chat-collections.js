/**
 * Setup Chat Collections
 *
 * Creates Appwrite collections for the chat system:
 * - chat_sessions: Store chat session metadata
 * - chat_messages: Store individual messages within sessions
 *
 * Run: node diagnostics/setup-chat-collections.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Client, Databases, ID } = require("node-appwrite");

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(
    process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1",
  )
  .setProject(process.env.APPWRITE_PROJECT_ID || "6972090b003512312836")
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || "69720e41002429abc875";

async function setupChatCollections() {
  try {
    console.log("🚀 Setting up chat system collections...\n");

    // 1. Create chat_sessions collection
    console.log("📋 Creating chat_sessions collection...");

    const sessionsCollection = await databases.createCollection(
      databaseId,
      ID.unique(),
      "chat_sessions",
      [
        // Read permissions for authenticated users and any
        'read("users")',
        'read("any")', // Allow guest sessions
        // Write permissions for authenticated users
        'write("users")',
        'write("any")', // Allow guest sessions
      ],
    );

    console.log(
      `✅ chat_sessions collection created: ${sessionsCollection.$id}\n`,
    );

    // Create attributes for chat_sessions
    const sessionAttributes = [
      {
        key: "userId",
        type: "string",
        size: 50,
        required: false,
        defaultValue: null,
      },
      {
        key: "userEmail",
        type: "string",
        size: 255,
        required: false,
        defaultValue: null,
      },
      {
        key: "userName",
        type: "string",
        size: 100,
        required: false,
        defaultValue: null,
      },
      {
        key: "status",
        type: "string",
        size: 20,
        required: false,
        defaultValue: null,
      },
      { key: "messageCount", type: "integer", required: false, min: 0 },
      { key: "isGuestSession", type: "boolean", required: false },
      {
        key: "adminId",
        type: "string",
        size: 50,
        required: false,
        defaultValue: null,
      },
      {
        key: "adminName",
        type: "string",
        size: 100,
        required: false,
        defaultValue: null,
      },
      { key: "lastActivity", type: "datetime", required: false },
      {
        key: "source",
        type: "string",
        size: 50,
        required: false,
        defaultValue: null,
      },
      { key: "endedAt", type: "datetime", required: false, defaultValue: null },
      {
        key: "endedBy",
        type: "string",
        size: 50,
        required: false,
        defaultValue: null,
      },
      {
        key: "endReason",
        type: "string",
        size: 100,
        required: false,
        defaultValue: null,
      },
      {
        key: "adminNote",
        type: "string",
        size: 500,
        required: false,
        defaultValue: null,
      },
    ];

    for (const attr of sessionAttributes) {
      try {
        if (attr.type === "string") {
          await databases.createStringAttribute(
            databaseId,
            sessionsCollection.$id,
            attr.key,
            attr.size,
            attr.required,
            attr.defaultValue === null ? undefined : attr.defaultValue,
            false, // not array
          );
        } else if (attr.type === "integer") {
          await databases.createIntegerAttribute(
            databaseId,
            sessionsCollection.$id,
            attr.key,
            attr.required,
            attr.min,
            undefined, // no max
            undefined, // no default
          );
        } else if (attr.type === "boolean") {
          await databases.createBooleanAttribute(
            databaseId,
            sessionsCollection.$id,
            attr.key,
            attr.required,
            undefined, // no default
          );
        } else if (attr.type === "datetime") {
          await databases.createDatetimeAttribute(
            databaseId,
            sessionsCollection.$id,
            attr.key,
            attr.required,
            undefined, // no default
          );
        }

        console.log(`  ✓ Added ${attr.key} attribute`);

        // Wait between attribute creation to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`  ❌ Error creating ${attr.key}: ${error.message}`);
      }
    }

    console.log("\n📋 Creating chat_messages collection...");

    // 2. Create chat_messages collection
    const messagesCollection = await databases.createCollection(
      databaseId,
      ID.unique(),
      "chat_messages",
      [
        // Read permissions for authenticated users and any
        'read("users")',
        'read("any")', // Allow guest sessions
        // Write permissions for authenticated users
        'write("users")',
        'write("any")', // Allow guest sessions
      ],
    );

    console.log(
      `✅ chat_messages collection created: ${messagesCollection.$id}\n`,
    );

    // Create attributes for chat_messages
    const messageAttributes = [
      { key: "sessionId", type: "string", size: 50, required: false },
      { key: "sender", type: "string", size: 20, required: false }, // 'customer' or 'admin'
      {
        key: "senderId",
        type: "string",
        size: 50,
        required: false,
        defaultValue: null,
      },
      { key: "senderName", type: "string", size: 100, required: false },
      { key: "message", type: "string", size: 2000, required: false },
      { key: "isRead", type: "boolean", required: false },
      {
        key: "editedAt",
        type: "datetime",
        required: false,
        defaultValue: null,
      },
    ];

    for (const attr of messageAttributes) {
      try {
        if (attr.type === "string") {
          await databases.createStringAttribute(
            databaseId,
            messagesCollection.$id,
            attr.key,
            attr.size,
            attr.required,
            attr.defaultValue === null ? undefined : attr.defaultValue,
            false, // not array
          );
        } else if (attr.type === "boolean") {
          await databases.createBooleanAttribute(
            databaseId,
            messagesCollection.$id,
            attr.key,
            attr.required,
            undefined, // no default
          );
        } else if (attr.type === "datetime") {
          await databases.createDatetimeAttribute(
            databaseId,
            messagesCollection.$id,
            attr.key,
            attr.required,
            undefined, // no default
          );
        }

        console.log(`  ✓ Added ${attr.key} attribute`);

        // Wait between attribute creation to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`  ❌ Error creating ${attr.key}: ${error.message}`);
      }
    }

    console.log("\n⏳ Waiting for collections to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 3. Create indexes for better performance
    console.log("\n🔍 Creating indexes...");

    try {
      // Index for chat_sessions
      await databases.createIndex(
        databaseId,
        sessionsCollection.$id,
        "status_index",
        "key",
        ["status"],
      );
      console.log("  ✓ Created status index for sessions");

      await databases.createIndex(
        databaseId,
        sessionsCollection.$id,
        "user_index",
        "key",
        ["userId"],
      );
      console.log("  ✓ Created user index for sessions");

      await databases.createIndex(
        databaseId,
        sessionsCollection.$id,
        "last_activity_index",
        "key",
        ["lastActivity"],
      );
      console.log("  ✓ Created lastActivity index for sessions");

      // Index for chat_messages
      await databases.createIndex(
        databaseId,
        messagesCollection.$id,
        "session_index",
        "key",
        ["sessionId"],
      );
      console.log("  ✓ Created session index for messages");

      await databases.createIndex(
        databaseId,
        messagesCollection.$id,
        "sender_index",
        "key",
        ["sender"],
      );
      console.log("  ✓ Created sender index for messages");
    } catch (error) {
      console.error(`  ❌ Error creating indexes: ${error.message}`);
    }

    console.log("\n🎉 Chat collections setup completed!");
    console.log("\n📝 Add these to your .env file:");
    console.log(
      `APPWRITE_CHAT_SESSIONS_COLLECTION_ID=${sessionsCollection.$id}`,
    );
    console.log(
      `APPWRITE_CHAT_MESSAGES_COLLECTION_ID=${messagesCollection.$id}`,
    );
    console.log("\n🚀 Chat system is ready to use!");
  } catch (error) {
    console.error("❌ Error setting up chat collections:", error.message);
    process.exit(1);
  }
}

// Check if required environment variables are set
if (
  !process.env.APPWRITE_ENDPOINT ||
  !process.env.APPWRITE_PROJECT_ID ||
  !process.env.APPWRITE_API_KEY
) {
  console.error(
    "❌ Missing required environment variables. Please ensure APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY are set.",
  );
  process.exit(1);
}

setupChatCollections();
