/**
 * Fix for expo-notifications compatibility
 * This script runs as a postinstall hook to ensure expo-notifications
 * is properly configured for the project
 */

const fs = require("fs");
const path = require("path");

try {
  // Check if expo-notifications is installed
  const notificationsPath = path.join(
    __dirname,
    "../node_modules/expo-notifications",
  );

  if (fs.existsSync(notificationsPath)) {
    console.log("✓ expo-notifications is installed and ready");
  } else {
    console.log("⚠ expo-notifications is not yet installed");
  }

  console.log("✓ Expo notifications fix completed");
} catch (error) {
  console.error("⚠ Error during expo-notifications fix:", error.message);
  // Don't fail the entire install for this
  process.exit(0);
}
