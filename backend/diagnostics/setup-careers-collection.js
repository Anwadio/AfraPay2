/**
 * Setup Careers Collection Attributes
 *
 * Run once to create all required attributes on the existing Appwrite
 * APPWRITE_CAREERS_COLLECTION_ID collection.
 *
 * Usage:
 *   node diagnostics/setup-careers-collection.js
 *
 * It is safe to re-run — existing attributes are skipped gracefully.
 */

"use strict";

require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const { Client, Databases } = require("node-appwrite");

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  APPWRITE_CAREERS_COLLECTION_ID,
} = process.env;

// ── Validate env ─────────────────────────────────────────────────────────────
const missing = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
  "APPWRITE_CAREERS_COLLECTION_ID",
].filter((k) => !process.env[k]);

if (missing.length) {
  console.error("❌  Missing environment variables:", missing.join(", "));
  process.exit(1);
}

// ── Appwrite client ───────────────────────────────────────────────────────────
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const db = new Databases(client);
const DB_ID = APPWRITE_DATABASE_ID;
const COL_ID = APPWRITE_CAREERS_COLLECTION_ID;

// ── Helper — skip if attribute already exists ─────────────────────────────────
async function safeCreate(label, fn) {
  try {
    await fn();
    console.log(`  ✅  ${label}`);
  } catch (err) {
    if (err?.code === 409) {
      console.log(`  ⏭️   ${label} — already exists, skipped`);
    } else {
      console.error(`  ❌  ${label} — ${err.message}`);
      throw err;
    }
  }
}

// ── Attribute definitions ─────────────────────────────────────────────────────
async function createAttributes() {
  console.log(`\n📋  Setting up attributes on collection: ${COL_ID}\n`);

  // title — required, max 200 chars
  await safeCreate("title (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "title", 200, true),
  );

  // department — required, max 100 chars
  await safeCreate("department (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "department", 100, true),
  );

  // location — required, max 200 chars
  await safeCreate("location (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "location", 200, true),
  );

  // type — "Full-time" | "Part-time" | "Contract" | "Internship"
  await safeCreate("type (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "type", 50, true),
  );

  // level — "Entry-level" | "Mid-level" | "Senior" | "Lead"
  await safeCreate("level (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "level", 50, true),
  );

  // description — required, max 2000 chars
  await safeCreate("description (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "description", 2000, true),
  );

  // tags — array of strings, max 10 items, each max 100 chars
  await safeCreate("tags (string[])", () =>
    db.createStringAttribute(
      DB_ID,
      COL_ID,
      "tags",
      100,
      false,
      undefined,
      true,
    ),
  );

  // isActive — whether the role is visible on public listings
  await safeCreate("isActive (boolean)", () =>
    db.createBooleanAttribute(DB_ID, COL_ID, "isActive", false, true),
  );

  // order — display order (lower = first), default 0
  await safeCreate("order (integer)", () =>
    db.createIntegerAttribute(DB_ID, COL_ID, "order", false, 0, 9999, 0),
  );

  // ── Indexes for common queries ────────────────────────────────────────────
  console.log("\n📑  Creating indexes…\n");

  await safeCreate("index: department", () =>
    db.createIndex(DB_ID, COL_ID, "idx_department", "key", ["department"]),
  );

  await safeCreate("index: isActive", () =>
    db.createIndex(DB_ID, COL_ID, "idx_isActive", "key", ["isActive"]),
  );

  await safeCreate("index: order", () =>
    db.createIndex(DB_ID, COL_ID, "idx_order", "key", ["order"]),
  );
}

// ── Seed default roles (optional) ─────────────────────────────────────────────
async function seedDefaultRoles() {
  const { ID, Query } = require("node-appwrite");

  // Only seed when the collection is empty
  const existing = await db.listDocuments(DB_ID, COL_ID, [Query.limit(1)]);
  if (existing.total > 0) {
    console.log("\n⏭️   Roles already seeded, skipping seed step.\n");
    return;
  }

  console.log("\n🌱  Seeding default open roles…\n");

  const DEFAULT_ROLES = [
    {
      title: "Senior Backend Engineer",
      department: "Engineering",
      location: "Juba, South Sudan",
      type: "Full-time",
      level: "Senior",
      description:
        "Build and scale the payment infrastructure that serves millions of South Sudanese users. You'll work on high-throughput APIs, real-time fraud detection pipelines, and distributed systems.",
      tags: ["Node.js", "PostgreSQL", "Redis", "AWS"],
      isActive: true,
      order: 1,
    },
    {
      title: "React / React Native Engineer",
      department: "Engineering",
      location: "Remote (East Africa)",
      type: "Full-time",
      level: "Mid-level",
      description:
        "Own the user-facing experience across our web and mobile apps. You'll collaborate closely with design and product to ship polished, accessible features to millions of users.",
      tags: ["React", "React Native", "TypeScript", "Tailwind CSS"],
      isActive: true,
      order: 2,
    },
    {
      title: "Product Manager — Payments",
      department: "Product",
      location: "Juba, South Sudan",
      type: "Full-time",
      level: "Mid-level",
      description:
        "Lead the roadmap for our core payments product. You'll work with engineering, design, compliance, and customer support to ship features that move money faster and more safely.",
      tags: ["Fintech", "Agile", "Payments", "Roadmap"],
      isActive: true,
      order: 3,
    },
    {
      title: "Head of Compliance & Risk",
      department: "Finance",
      location: "Juba, South Sudan",
      type: "Full-time",
      level: "Lead",
      description:
        "Own our regulatory compliance programme across South Sudan and future markets. You'll liaise with the Bank of South Sudan, manage audits, and build our risk frameworks.",
      tags: ["AML", "KYC", "Regulatory", "Risk Management"],
      isActive: true,
      order: 4,
    },
    {
      title: "Customer Support Specialist",
      department: "Support",
      location: "Juba / Wau",
      type: "Full-time",
      level: "Entry-level",
      description:
        "Be the first point of contact for our users. You'll resolve account queries, investigate transaction issues, and improve support processes to raise our satisfaction scores.",
      tags: ["Customer Service", "Zendesk", "Arabic/English"],
      isActive: true,
      order: 5,
    },
    {
      title: "Growth & Performance Marketing Manager",
      department: "Marketing",
      location: "Remote (East Africa)",
      type: "Full-time",
      level: "Mid-level",
      description:
        "Drive user acquisition and retention through data-driven campaigns, partnerships, and community programmes across South Sudan and the wider East African market.",
      tags: ["SEO/SEM", "Meta Ads", "Analytics", "Copywriting"],
      isActive: true,
      order: 6,
    },
    {
      title: "DevOps / Cloud Infrastructure Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      level: "Senior",
      description:
        "Keep our cloud infrastructure secure, reliable, and fast. You'll own CI/CD pipelines, Kubernetes clusters, monitoring, and disaster recovery for a 99.98% uptime product.",
      tags: ["AWS", "Kubernetes", "Terraform", "Prometheus"],
      isActive: true,
      order: 7,
    },
    {
      title: "Field Operations Agent — Malakal",
      department: "Operations",
      location: "Malakal, South Sudan",
      type: "Full-time",
      level: "Entry-level",
      description:
        "Represent AfraPay on the ground in Upper Nile State. You'll onboard new merchants, support agent networks, and gather community feedback to inform our expansion strategy.",
      tags: ["Field Sales", "Community", "Arabic", "Training"],
      isActive: true,
      order: 8,
    },
  ];

  for (const role of DEFAULT_ROLES) {
    try {
      await db.createDocument(DB_ID, COL_ID, ID.unique(), role);
      console.log(`  ✅  Seeded: ${role.title}`);
    } catch (err) {
      console.error(`  ❌  Failed to seed "${role.title}": ${err.message}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await createAttributes();
    // Wait briefly for attributes to be available before seeding
    console.log("\n⏳  Waiting 5 s for attributes to propagate…");
    await new Promise((r) => setTimeout(r, 5000));
    await seedDefaultRoles();
    console.log("\n🎉  Careers collection setup complete!\n");
  } catch (err) {
    console.error("\n💥  Setup failed:", err.message);
    process.exit(1);
  }
})();
