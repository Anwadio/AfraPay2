const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

const client = new Client();
const databases = new Databases(client);

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_BLOG_COLLECTION_ID;

async function setupBlogCollection() {
  try {
    console.log('Setting up Blog Collection attributes...');

    // Create attributes for blog posts
    const attributes = [
      {
        key: 'category',
        type: 'string',
        size: 50,
        required: true
      },
      {
        key: 'title',
        type: 'string',
        size: 255,
        required: true
      },
      {
        key: 'slug',
        type: 'string',
        size: 255,
        required: true
      },
      {
        key: 'excerpt',
        type: 'string',
        size: 500,
        required: true
      },
      {
        key: 'content',
        type: 'string',
        size: 50000,
        required: false
      },
      {
        key: 'author',
        type: 'string',
        size: 100,
        required: true
      },
      {
        key: 'authorRole',
        type: 'string',
        size: 100,
        required: true
      },
      {
        key: 'avatar',
        type: 'string',
        size: 10,
        required: true
      },
      {
        key: 'readTime',
        type: 'string',
        size: 20,
        required: true
      },
      {
        key: 'featured',
        type: 'boolean',
        required: true
      },
      {
        key: 'tagText',
        type: 'string',
        size: 50,
        required: true
      },
      {
        key: 'tagVariant',
        type: 'string',
        size: 20,
        required: true
      },
      {
        key: 'imageUrl',
        type: 'url',
        required: false
      },
      {
        key: 'publishedAt',
        type: 'datetime',
        required: true
      },
      {
        key: 'status',
        type: 'string',
        size: 20,
        required: true
      }
    ];

    // Create each attribute
    for (const attr of attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.size,
            attr.required
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required
          );
        } else if (attr.type === 'url') {
          await databases.createUrlAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required
          );
        }

        console.log(`✅ Created attribute: ${attr.key}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        if (error.message?.includes('already exists')) {
          console.log(`⚠️  Attribute ${attr.key} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating attribute ${attr.key}:`, error.message);
        }
      }
    }

    console.log('\n📊 Creating indexes for better performance...');
    
    // Create indexes for better query performance
    const indexes = [
      {
        key: 'category_index',
        type: 'key',
        attributes: ['category']
      },
      {
        key: 'featured_index',
        type: 'key',
        attributes: ['featured']
      },
      {
        key: 'status_index',
        type: 'key',
        attributes: ['status']
      },
      {
        key: 'published_index',
        type: 'key',
        attributes: ['publishedAt']
      },
      {
        key: 'slug_unique',
        type: 'unique',
        attributes: ['slug']
      }
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          databaseId,
          collectionId,
          index.key,
          index.type,
          index.attributes
        );
        console.log(`✅ Created index: ${index.key}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (error.message?.includes('already exists')) {
          console.log(`⚠️  Index ${index.key} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating index ${index.key}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Blog collection setup completed!');
    console.log('📝 You can now run the seeding script to populate the collection with sample data.');
    
  } catch (error) {
    console.error('❌ Error setting up blog collection:', error);
    process.exit(1);
  }
}

// Run the setup
setupBlogCollection();