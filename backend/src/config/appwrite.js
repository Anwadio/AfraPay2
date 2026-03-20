/**
 * Appwrite Configuration
 * Exports configured Appwrite clients for controllers
 */

const { Client, Databases, Query } = require("node-appwrite");
const config = require("./environment");

// Create and configure Appwrite client
const client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

// Create database instance
const databases = new Databases(client);

// Export configured instances
module.exports = {
  client,
  databases,
  Query,
};
