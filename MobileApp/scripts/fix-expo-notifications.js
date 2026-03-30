/* eslint-disable no-undef */
/**
 * Postinstall fix for expo-notifications@0.32.16
 *
 * The published build is missing `unregisterForNotificationsAsync.js`,
 * which causes Metro to fail with:
 *   "Unable to resolve './unregisterForNotificationsAsync'"
 *
 * This script creates a no-op stub so the bundler can resolve the import.
 * Run automatically via the `postinstall` npm script.
 */
const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-notifications",
  "build",
  "unregisterForNotificationsAsync.js",
);

if (!fs.existsSync(target)) {
  fs.writeFileSync(
    target,
    [
      "// Auto-generated stub — unregisterForNotificationsAsync is missing",
      "// from expo-notifications@0.32.16 build output.",
      "export default async function unregisterForNotificationsAsync() {}",
      "",
    ].join("\n"),
  );
  console.log("[postinstall] Created missing expo-notifications stub.");
} else {
  console.log(
    "[postinstall] expo-notifications stub already exists, skipping.",
  );
}
