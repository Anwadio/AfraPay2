/**
 * Education Collections Setup Script
 *
 * Creates attributes for education collections if they don't exist.
 * Safe to run multiple times (idempotent).
 *
 * Collections setup:
 * - EDUCATION_CONTENT_COLLECTION
 * - EDUCATION_CATEGORIES_COLLECTION
 * - ENROLLMENTS_COLLECTION (if not exists)
 *
 * Run with: node diagnostics/setup-education-collections.js
 */

const { Client, Databases, ID } = require("node-appwrite");
require("dotenv").config();

const client = new Client();
const databases = new Databases(client);

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databaseId = process.env.APPWRITE_DATABASE_ID;
const contentCollectionId =
  process.env.APPWRITE_EDUCATION_CONTENT_COLLECTION_ID;
const categoriesCollectionId =
  process.env.APPWRITE_EDUCATION_CATEGORIES_COLLECTION_ID;
const learningPathsCollectionId =
  process.env.APPWRITE_LEARNING_PATHS_COLLECTION_ID;
const enrollmentsCollectionId = process.env.APPWRITE_ENROLLMENTS_COLLECTION_ID;
const progressCollectionId = process.env.APPWRITE_PROGRESS_COLLECTION_ID;
const bookmarksCollectionId = process.env.APPWRITE_BOOKMARKS_COLLECTION_ID;

// Helper function to create attribute with error handling
async function createAttributeIfNotExists(collectionId, attributeConfig) {
  try {
    const { key, type, ...config } = attributeConfig;

    let result;
    switch (type) {
      case "string":
        result = await databases.createStringAttribute(
          databaseId,
          collectionId,
          key,
          config.size,
          config.required || false,
          config.default || undefined,
          config.array || false,
        );
        break;
      case "boolean":
        result = await databases.createBooleanAttribute(
          databaseId,
          collectionId,
          key,
          config.required || false,
          config.default || undefined,
          config.array || false,
        );
        break;
      case "integer":
        result = await databases.createIntegerAttribute(
          databaseId,
          collectionId,
          key,
          config.required || false,
          config.min || undefined,
          config.max || undefined,
          config.default || undefined,
          config.array || false,
        );
        break;
      case "float":
        result = await databases.createFloatAttribute(
          databaseId,
          collectionId,
          key,
          config.required || false,
          config.min || undefined,
          config.max || undefined,
          config.default || undefined,
          config.array || false,
        );
        break;
      case "datetime":
        result = await databases.createDatetimeAttribute(
          databaseId,
          collectionId,
          key,
          config.required || false,
          config.default || undefined,
          config.array || false,
        );
        break;
      case "url":
        result = await databases.createUrlAttribute(
          databaseId,
          collectionId,
          key,
          config.required || false,
          config.default || undefined,
          config.array || false,
        );
        break;
      case "email":
        result = await databases.createEmailAttribute(
          databaseId,
          collectionId,
          key,
          config.required || false,
          config.default || undefined,
          config.array || false,
        );
        break;
      case "enum":
        result = await databases.createEnumAttribute(
          databaseId,
          collectionId,
          key,
          config.elements,
          config.required || false,
          config.default || undefined,
          config.array || false,
        );
        break;
      default:
        throw new Error(`Unsupported attribute type: ${type}`);
    }

    console.log(`✅ Created attribute: ${key} (${type})`);
    return result;
  } catch (error) {
    if (error.message?.includes("already exists") || error.code === 409) {
      console.log(
        `⚠️  Attribute ${attributeConfig.key} already exists, skipping...`,
      );
      return null;
    }
    console.error(
      `❌ Failed to create attribute ${attributeConfig.key}:`,
      error.message,
    );
    throw error;
  }
}

// Helper to add delay between requests
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupEducationContentCollection() {
  if (!contentCollectionId) {
    console.log(
      "⚠️  APPWRITE_EDUCATION_CONTENT_COLLECTION_ID not set, skipping content collection setup",
    );
    return;
  }

  console.log("\n🚀 Setting up Education Content Collection attributes...");

  const contentAttributes = [
    {
      key: "title",
      type: "string",
      size: 255,
      required: true,
    },
    {
      key: "slug",
      type: "string",
      size: 255,
      required: true,
    },
    {
      key: "description",
      type: "string",
      size: 1000,
      required: true,
    },
    {
      key: "body",
      type: "string",
      size: 65000, // Large text content
      required: false,
    },
    {
      key: "excerpt",
      type: "string",
      size: 500,
      required: false,
    },
    {
      key: "categorySlug",
      type: "string",
      size: 100,
      required: false,
    },
    {
      key: "type",
      type: "enum",
      elements: [
        "article",
        "video",
        "quiz",
        "tool",
        "infographic",
        "podcast",
        "course",
        "webinar",
        "guide",
      ],
      required: true,
    },
    {
      key: "level",
      type: "enum",
      elements: ["beginner", "intermediate", "advanced", "all_levels"],
      required: false,
      default: "beginner",
    },
    {
      key: "status",
      type: "enum",
      elements: ["draft", "published", "archived"],
      required: false,
      default: "draft",
    },
    {
      key: "tags",
      type: "string",
      size: 500, // Comma-separated or JSON array
      required: false,
      array: true,
    },
    {
      key: "durationMinutes",
      type: "integer",
      required: false,
      min: 0,
      max: 1440, // Max 24 hours
      default: 5,
    },
    {
      key: "contentUrl",
      type: "url",
      required: false,
    },
    {
      key: "videoUrl",
      type: "url",
      required: false,
    },
    {
      key: "thumbnail",
      type: "url",
      required: false,
    },
    {
      key: "thumbnailFileId",
      type: "string",
      size: 50,
      required: false,
    },
    {
      key: "isPremium",
      type: "boolean",
      required: false,
      default: false,
    },
    {
      key: "featured",
      type: "boolean",
      required: false,
      default: false,
    },
    {
      key: "authorId",
      type: "string",
      size: 50,
      required: true,
    },
    {
      key: "authorName",
      type: "string",
      size: 100,
      required: false,
    },
    {
      key: "views",
      type: "integer",
      required: false,
      min: 0,
      default: 0,
    },
    {
      key: "likes",
      type: "integer",
      required: false,
      min: 0,
      default: 0,
    },
    {
      key: "publishedAt",
      type: "datetime",
      required: false,
    },
    {
      key: "createdAt",
      type: "datetime",
      required: true,
    },
    {
      key: "updatedAt",
      type: "datetime",
      required: true,
    },
  ];

  for (const attr of contentAttributes) {
    try {
      await createAttributeIfNotExists(contentCollectionId, attr);
      await delay(500); // Prevent rate limiting
    } catch (error) {
      console.error(`Failed to create attribute ${attr.key}:`, error);
    }
  }

  console.log("✅ Education Content Collection setup completed");
}

async function setupEducationCategoriesCollection() {
  if (!categoriesCollectionId) {
    console.log(
      "⚠️  APPWRITE_EDUCATION_CATEGORIES_COLLECTION_ID not set, skipping categories collection setup",
    );
    return;
  }

  console.log("\n🚀 Setting up Education Categories Collection attributes...");

  const categoryAttributes = [
    {
      key: "name",
      type: "string",
      size: 100,
      required: true,
    },
    {
      key: "slug",
      type: "string",
      size: 100,
      required: true,
    },
    {
      key: "description",
      type: "string",
      size: 500,
      required: false,
    },
    {
      key: "icon",
      type: "string",
      size: 50,
      required: false,
    },
    {
      key: "color",
      type: "string",
      size: 20,
      required: false,
    },
    {
      key: "active",
      type: "boolean",
      required: false,
      default: true,
    },
    {
      key: "sortOrder",
      type: "integer",
      required: false,
      min: 0,
      default: 0,
    },
    {
      key: "createdAt",
      type: "datetime",
      required: true,
    },
    {
      key: "updatedAt",
      type: "datetime",
      required: true,
    },
  ];

  for (const attr of categoryAttributes) {
    try {
      await createAttributeIfNotExists(categoriesCollectionId, attr);
      await delay(500); // Prevent rate limiting
    } catch (error) {
      console.error(`Failed to create attribute ${attr.key}:`, error);
    }
  }

  console.log("✅ Education Categories Collection setup completed");
}

async function setupEnrollmentsCollection() {
  if (!enrollmentsCollectionId) {
    console.log(
      "⚠️  APPWRITE_ENROLLMENTS_COLLECTION_ID not set, skipping enrollments collection setup",
    );
    return;
  }

  console.log("\n🚀 Setting up Enrollments Collection attributes...");

  const enrollmentAttributes = [
    {
      key: "userId",
      type: "string",
      size: 50,
      required: true,
    },
    {
      key: "contentId",
      type: "string",
      size: 50,
      required: false, // For individual content enrollment
    },
    {
      key: "pathId",
      type: "string",
      size: 50,
      required: false, // For learning path enrollment
    },
    {
      key: "type",
      type: "enum",
      elements: ["content", "path"],
      required: true,
    },
    {
      key: "status",
      type: "enum",
      elements: ["active", "in-progress", "completed", "paused"],
      required: false,
      default: "active",
    },
    // For individual content enrollments
    {
      key: "progress",
      type: "integer",
      required: false,
      min: 0,
      max: 100,
      default: 0,
    },
    // For learning path enrollments
    {
      key: "progressPercent",
      type: "integer",
      required: false,
      min: 0,
      max: 100,
      default: 0,
    },
    {
      key: "completedContentIds",
      type: "string",
      size: 50,
      required: false,
      array: true, // Array of completed content IDs for paths
    },
    {
      key: "completedAt",
      type: "datetime",
      required: false,
    },
    {
      key: "enrolledAt",
      type: "datetime",
      required: true,
    },
    {
      key: "lastAccessedAt",
      type: "datetime",
      required: false,
    },
    {
      key: "lastActivityAt",
      type: "datetime",
      required: false,
    },
  ];

  for (const attr of enrollmentAttributes) {
    try {
      await createAttributeIfNotExists(enrollmentsCollectionId, attr);
      await delay(500); // Prevent rate limiting
    } catch (error) {
      console.error(`Failed to create attribute ${attr.key}:`, error);
    }
  }

  console.log("✅ Enrollments Collection setup completed");
}

async function setupLearningPathsCollection() {
  if (!learningPathsCollectionId) {
    console.log(
      "⚠️  APPWRITE_LEARNING_PATHS_COLLECTION_ID not set, skipping learning paths collection setup",
    );
    return;
  }

  console.log("\n🚀 Setting up Learning Paths Collection attributes...");

  const pathAttributes = [
    {
      key: "title",
      type: "string",
      size: 255,
      required: true,
    },
    {
      key: "slug",
      type: "string",
      size: 255,
      required: true,
    },
    {
      key: "description",
      type: "string",
      size: 1000,
      required: false,
    },
    {
      key: "categorySlug",
      type: "string",
      size: 100,
      required: false,
    },
    {
      key: "level",
      type: "enum",
      elements: ["beginner", "intermediate", "advanced", "all_levels"],
      required: false,
      default: "beginner",
    },
    {
      key: "status",
      type: "enum",
      elements: ["draft", "published", "archived"],
      required: false,
      default: "draft",
    },
    {
      key: "tags",
      type: "string",
      size: 500,
      required: false,
      array: true,
    },
    {
      key: "contentIds",
      type: "string",
      size: 50,
      required: false,
      array: true, // Array of content IDs in this path
    },
    {
      key: "thumbnailFileId",
      type: "string",
      size: 50,
      required: false,
    },
    {
      key: "isPremium",
      type: "boolean",
      required: false,
      default: false,
    },
    {
      key: "featured",
      type: "boolean",
      required: false,
      default: false,
    },
    {
      key: "estimatedWeeks",
      type: "integer",
      required: false,
      min: 0,
      default: 0,
    },
    {
      key: "authorId",
      type: "string",
      size: 50,
      required: true,
    },
    {
      key: "enrolmentCount",
      type: "integer",
      required: false,
      min: 0,
      default: 0,
    },
    {
      key: "publishedAt",
      type: "datetime",
      required: false,
    },
    {
      key: "createdAt",
      type: "datetime",
      required: true,
    },
    {
      key: "updatedAt",
      type: "datetime",
      required: true,
    },
  ];

  for (const attr of pathAttributes) {
    try {
      await createAttributeIfNotExists(learningPathsCollectionId, attr);
      await delay(500); // Prevent rate limiting
    } catch (error) {
      console.error(`Failed to create attribute ${attr.key}:`, error);
    }
  }

  console.log("✅ Learning Paths Collection setup completed");
}

async function setupProgressCollection() {
  if (!progressCollectionId) {
    console.log(
      "⚠️  APPWRITE_PROGRESS_COLLECTION_ID not set, skipping progress collection setup",
    );
    return;
  }

  console.log("\n🚀 Setting up Progress Collection attributes...");

  const progressAttributes = [
    {
      key: "userId",
      type: "string",
      size: 50,
      required: true,
    },
    {
      key: "pathId",
      type: "string",
      size: 50,
      required: true,
    },
    {
      key: "contentId",
      type: "string",
      size: 50,
      required: true,
    },
    {
      key: "completed",
      type: "boolean",
      required: false,
      default: false,
    },
    {
      key: "timeSpentSeconds",
      type: "integer",
      required: false,
      min: 0,
      default: 0,
    },
    {
      key: "quizScore",
      type: "integer",
      required: false,
      min: 0,
      max: 100,
    },
    {
      key: "completedAt",
      type: "datetime",
      required: false,
    },
    {
      key: "createdAt",
      type: "datetime",
      required: true,
    },
    {
      key: "updatedAt",
      type: "datetime",
      required: true,
    },
  ];

  for (const attr of progressAttributes) {
    try {
      await createAttributeIfNotExists(progressCollectionId, attr);
      await delay(500); // Prevent rate limiting
    } catch (error) {
      console.error(`Failed to create attribute ${attr.key}:`, error);
    }
  }

  console.log("✅ Progress Collection setup completed");
}

async function setupBookmarksCollection() {
  if (!bookmarksCollectionId) {
    console.log(
      "⚠️  APPWRITE_BOOKMARKS_COLLECTION_ID not set, skipping bookmarks collection setup",
    );
    return;
  }

  console.log("\n🚀 Setting up Bookmarks Collection attributes...");

  const bookmarkAttributes = [
    {
      key: "userId",
      type: "string",
      size: 50,
      required: true,
    },
    {
      key: "contentId",
      type: "string",
      size: 50,
      required: true,
    },
    {
      key: "createdAt",
      type: "datetime",
      required: true,
    },
  ];

  for (const attr of bookmarkAttributes) {
    try {
      await createAttributeIfNotExists(bookmarksCollectionId, attr);
      await delay(500); // Prevent rate limiting
    } catch (error) {
      console.error(`Failed to create attribute ${attr.key}:`, error);
    }
  }

  console.log("✅ Bookmarks Collection setup completed");
}

async function createIndexes() {
  console.log("\n🚀 Creating indexes for better query performance...");

  const indexes = [
    // Content collection indexes
    {
      collectionId: contentCollectionId,
      key: "content_status_idx",
      type: "key",
      attributes: ["status"],
    },
    {
      collectionId: contentCollectionId,
      key: "content_category_idx",
      type: "key",
      attributes: ["categorySlug"],
    },
    {
      collectionId: contentCollectionId,
      key: "content_type_idx",
      type: "key",
      attributes: ["type"],
    },
    {
      collectionId: contentCollectionId,
      key: "content_featured_idx",
      type: "key",
      attributes: ["featured"],
    },
    {
      collectionId: contentCollectionId,
      key: "content_published_idx",
      type: "key",
      attributes: ["publishedAt"],
      orders: ["DESC"],
    },
    // Learning Paths collection indexes
    {
      collectionId: learningPathsCollectionId,
      key: "paths_status_idx",
      type: "key",
      attributes: ["status"],
    },
    {
      collectionId: learningPathsCollectionId,
      key: "paths_category_idx",
      type: "key",
      attributes: ["categorySlug"],
    },
    {
      collectionId: learningPathsCollectionId,
      key: "paths_featured_idx",
      type: "key",
      attributes: ["featured"],
    },
    {
      collectionId: learningPathsCollectionId,
      key: "paths_created_idx",
      type: "key",
      attributes: ["createdAt"],
      orders: ["DESC"],
    },
    // Categories collection indexes
    {
      collectionId: categoriesCollectionId,
      key: "category_slug_idx",
      type: "unique",
      attributes: ["slug"],
    },
    {
      collectionId: categoriesCollectionId,
      key: "category_sort_idx",
      type: "key",
      attributes: ["sortOrder"],
      orders: ["ASC"],
    },
    // Enrollments collection indexes
    {
      collectionId: enrollmentsCollectionId,
      key: "enrollment_user_idx",
      type: "key",
      attributes: ["userId"],
    },
    {
      collectionId: enrollmentsCollectionId,
      key: "enrollment_user_content_idx",
      type: "unique",
      attributes: ["userId", "contentId"],
    },
    {
      collectionId: enrollmentsCollectionId,
      key: "enrollment_user_path_idx",
      type: "unique",
      attributes: ["userId", "pathId"],
    },
    // Progress collection indexes
    {
      collectionId: progressCollectionId,
      key: "progress_user_path_idx",
      type: "key",
      attributes: ["userId", "pathId"],
    },
    {
      collectionId: progressCollectionId,
      key: "progress_user_path_content_idx",
      type: "unique",
      attributes: ["userId", "pathId", "contentId"],
    },
    // Bookmarks collection indexes
    {
      collectionId: bookmarksCollectionId,
      key: "bookmark_user_idx",
      type: "key",
      attributes: ["userId"],
    },
    {
      collectionId: bookmarksCollectionId,
      key: "bookmark_user_content_idx",
      type: "unique",
      attributes: ["userId", "contentId"],
    },
  ];

  for (const index of indexes) {
    try {
      if (!index.collectionId) continue; // Skip if collection ID is not set

      await databases.createIndex(
        databaseId,
        index.collectionId,
        index.key,
        index.type,
        index.attributes,
        index.orders || undefined,
      );
      console.log(`✅ Created index: ${index.key}`);
      await delay(1000); // Indexes take longer to create
    } catch (error) {
      if (error.message?.includes("already exists") || error.code === 409) {
        console.log(`⚠️  Index ${index.key} already exists, skipping...`);
      } else {
        console.error(`❌ Failed to create index ${index.key}:`, error.message);
      }
    }
  }
}

async function seedInitialCategories() {
  if (!categoriesCollectionId) {
    console.log("⚠️  Categories collection not configured, skipping seeding");
    return;
  }

  console.log("\n🌱 Seeding initial categories...");

  const initialCategories = [
    {
      name: "Personal Finance",
      slug: "personal-finance",
      description:
        "Master the basics of budgeting, saving, and personal financial management",
      icon: "wallet",
      color: "#10B981",
    },
    {
      name: "Investing",
      slug: "investing",
      description:
        "Learn investment strategies and build a diversified portfolio",
      icon: "trending-up",
      color: "#3B82F6",
    },
    {
      name: "Cryptocurrency",
      slug: "cryptocurrency",
      description:
        "Understand digital currencies, blockchain, and crypto trading",
      icon: "cpu",
      color: "#F59E0B",
    },
    {
      name: "Credit Management",
      slug: "credit",
      description: "Build and maintain a healthy credit score",
      icon: "credit-card",
      color: "#8B5CF6",
    },
    {
      name: "Tax Planning",
      slug: "taxes",
      description: "Smart tax strategies to optimize your finances",
      icon: "calculator",
      color: "#EF4444",
    },
  ];

  for (const category of initialCategories) {
    try {
      const now = new Date().toISOString();
      await databases.createDocument(
        databaseId,
        categoriesCollectionId,
        ID.unique(),
        {
          ...category,
          active: true,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        },
      );
      console.log(`✅ Created category: ${category.name}`);
      await delay(300);
    } catch (error) {
      if (error.message?.includes("already exists")) {
        console.log(
          `⚠️  Category ${category.name} might already exist, skipping...`,
        );
      } else {
        console.error(
          `❌ Failed to create category ${category.name}:`,
          error.message,
        );
      }
    }
  }

  console.log("✅ Categories seeding completed");
}

async function main() {
  console.log("🎓 Education Collections Setup Script");
  console.log("=====================================");

  console.log(`Database ID: ${databaseId}`);
  console.log(`Content Collection ID: ${contentCollectionId || "NOT SET"}`);
  console.log(
    `Categories Collection ID: ${categoriesCollectionId || "NOT SET"}`,
  );
  console.log(
    `Learning Paths Collection ID: ${learningPathsCollectionId || "NOT SET"}`,
  );
  console.log(
    `Enrollments Collection ID: ${enrollmentsCollectionId || "NOT SET"}`,
  );
  console.log(`Progress Collection ID: ${progressCollectionId || "NOT SET"}`);
  console.log(`Bookmarks Collection ID: ${bookmarksCollectionId || "NOT SET"}`);

  try {
    await setupEducationContentCollection();
    await setupEducationCategoriesCollection();
    await setupLearningPathsCollection();
    await setupEnrollmentsCollection();
    await setupProgressCollection();
    await setupBookmarksCollection();
    await createIndexes();
    await seedInitialCategories();

    console.log("\n🎉 Education collections setup completed successfully!");
    console.log("\nNext steps:");
    console.log(
      "1. Set missing collection IDs in your .env file if any were shown as NOT SET",
    );
    console.log("2. Run the backend server to test the education endpoints");
    console.log("3. Use the admin endpoints to create some sample content");
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  setupEducationContentCollection,
  setupEducationCategoriesCollection,
  setupLearningPathsCollection,
  setupEnrollmentsCollection,
  setupProgressCollection,
  setupBookmarksCollection,
  createIndexes,
  seedInitialCategories,
};
