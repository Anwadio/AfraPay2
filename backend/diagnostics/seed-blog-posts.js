const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config();

const client = new Client();
const databases = new Databases(client);

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_BLOG_COLLECTION_ID;

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// Helper function to convert date string to ISO format
function convertToISODate(dateString) {
  const date = new Date(dateString);
  return date.toISOString();
}

// Sample blog posts data
const BLOG_POSTS = [
  {
    category: "Product",
    title: "Introducing AfraPay 2.0: Faster, Smarter, More Secure",
    excerpt: "We've completely rebuilt our core payment engine from the ground up. Here's what's new and why it matters for millions of South Sudanese users.",
    content: `We're thrilled to announce the launch of AfraPay 2.0, a complete overhaul of our payment platform designed to serve the growing needs of South Sudan's digital economy.

## What's New in AfraPay 2.0

### Enhanced Security
- End-to-end encryption for all transactions
- Biometric authentication support
- Advanced fraud detection using machine learning
- Multi-factor authentication (MFA) for all accounts

### Improved Performance
- 3x faster transaction processing
- 99.9% uptime guarantee
- Real-time transaction updates
- Offline capability for remote areas

### New Features
- Savings Goals with automated transfers
- Business accounts with team management
- QR code payments for merchants
- International money transfers

### Better User Experience
- Redesigned mobile app with intuitive navigation
- Voice commands in local languages
- 24/7 customer support in Arabic and English
- Simplified onboarding process

## Impact on Users

With AfraPay 2.0, users can expect faster, more secure transactions that work even in areas with limited internet connectivity. Our new savings features help families build financial resilience, while businesses can manage their operations more efficiently.

## What's Next

Over the coming months, we'll be rolling out additional features including cryptocurrency support, microloans, and insurance products tailored for the South Sudanese market.`,
    author: "Amina Hassan",
    authorRole: "CTO & Co-founder",
    avatar: "AH",
    date: "March 10, 2026",
    readTime: "5 min read",
    featured: true,
    tagText: "New Release",
    tagVariant: "primary",
    imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop",
    status: "published"
  },
  {
    category: "Finance",
    title: "Understanding Mobile Money in South Sudan: A Complete Guide",
    excerpt: "Mobile money is reshaping how South Sudanese families manage their finances. We break down everything you need to know — from sending money to saving for the future.",
    content: `Mobile money has revolutionized financial services across Africa, and South Sudan is no exception. In this comprehensive guide, we'll explore how mobile money works, its benefits, and how you can make the most of these services.

## What is Mobile Money?

Mobile money is a financial service that allows you to store, send, and receive money using your mobile phone. Unlike traditional banking, mobile money doesn't require a bank account or physical bank branches.

## How Mobile Money Works in South Sudan

### Getting Started
1. Visit any authorized agent
2. Provide your ID and complete registration
3. Receive your mobile money account
4. Start transacting immediately

### Basic Services
- **Send Money**: Transfer funds to family and friends anywhere in the country
- **Receive Money**: Get payments from anywhere, anytime
- **Pay Bills**: Settle utility bills, school fees, and merchant payments
- **Buy Airtime**: Top up your phone credit instantly
- **Cash In/Out**: Deposit or withdraw money at agent locations

## Benefits for South Sudanese Users

### Financial Inclusion
Mobile money provides access to financial services for the unbanked population, particularly in rural areas where traditional banks are scarce.

### Security
Digital transactions are safer than carrying cash, with transaction records providing proof of payment.

### Convenience
24/7 access to your money without the need to visit physical locations during business hours.

### Cost-Effective
Lower transaction fees compared to traditional money transfer services.

## Tips for Safe Mobile Money Use

1. **Keep your PIN secret** - Never share your mobile money PIN with anyone
2. **Verify recipients** - Always confirm phone numbers before sending money
3. **Check transaction details** - Review all details before confirming transactions
4. **Use authorized agents** - Only transact with licensed mobile money agents
5. **Keep records** - Save transaction messages for future reference

## The Future of Mobile Money in South Sudan

As internet connectivity improves and smartphone adoption increases, we expect to see more advanced services like savings accounts, loans, and insurance products becoming available through mobile money platforms.`,
    author: "Kwame Asante",
    authorRole: "CEO & Co-founder",
    avatar: "KA",
    date: "March 6, 2026",
    readTime: "8 min read",
    featured: false,
    tagText: "Guide",
    tagVariant: "secondary",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop",
    status: "published"
  },
  {
    category: "Security",
    title: "How AfraPay Protects Your Money: An Inside Look",
    excerpt: "From 256-bit encryption to AI-driven fraud detection, we explain the multiple layers of security that keep your funds safe 24/7.",
    content: `At AfraPay, security isn't an afterthought—it's built into every aspect of our platform. Here's how we protect your money and personal information.

## Multi-Layer Security Architecture

### 1. Encryption
- **256-bit SSL encryption** for all data transmission
- **AES-256 encryption** for data storage
- **End-to-end encryption** for sensitive transactions

### 2. Authentication
- **Two-factor authentication** (2FA) for all accounts
- **Biometric authentication** support (fingerprint, face ID)
- **Device registration** for additional security

### 3. Fraud Detection
- **Real-time transaction monitoring** using machine learning
- **Behavioral analysis** to detect unusual activity patterns
- **Risk scoring** for every transaction

## How We Monitor Transactions

### AI-Powered Monitoring
Our advanced AI systems analyze every transaction in real-time, looking for:
- Unusual spending patterns
- Geographic anomalies
- Time-based irregularities
- Device and network changes

### Human Oversight
Our security team provides 24/7 monitoring for:
- High-value transactions
- Cross-border payments
- Suspicious account activities
- Customer-reported concerns

## What You Can Do

### Enable Security Features
1. **Turn on 2FA** in your account settings
2. **Set up biometric authentication** if your device supports it
3. **Create strong, unique passwords** for your account
4. **Enable transaction notifications** for real-time alerts

### Safe Practices
- Never share your login credentials
- Log out completely after each session
- Use secure networks for transactions
- Report suspicious activity immediately

### Regular Security Updates
We continuously update our security measures to stay ahead of emerging threats. Users receive automatic security updates through our mobile app.

## Regulatory Compliance

AfraPay complies with:
- Bank of South Sudan regulations
- International anti-money laundering (AML) standards
- Know Your Customer (KYC) requirements
- Payment Card Industry (PCI) DSS standards

## Emergency Response

If you notice unauthorized activity:
1. **Contact us immediately** through our 24/7 support
2. **Change your password** as soon as possible
3. **Review your transaction history** for any unusual activity
4. **Follow up on our investigation** status

Your financial security is our top priority, and we're committed to maintaining the highest standards of protection for all our users.`,
    author: "Joseph Mbeki",
    authorRole: "Head of Security",
    avatar: "JM",
    date: "February 28, 2026",
    readTime: "6 min read",
    featured: false,
    tagText: "Security",
    tagVariant: "success",
    imageUrl: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=400&fit=crop",
    status: "published"
  },
  {
    category: "Community",
    title: "AfraPay in Wau: Bringing Digital Finance to Western Bahr el Ghazal",
    excerpt: "We recently opened our second branch in Wau. Read about how local traders and farmers are using AfraPay to grow their businesses.",
    content: `The opening of our Wau branch marks a significant milestone in AfraPay's mission to bring financial inclusion to all corners of South Sudan. Here's how our services are transforming lives in Western Bahr el Ghazal.

## Community Impact

### Local Traders
Small business owners in Wau's bustling markets are now using AfraPay to:
- Accept digital payments from customers
- Pay suppliers more efficiently
- Track their business finances
- Access working capital through our merchant loans

**Success Story: Mama Sarah's Shop**
Sarah Deng, who runs a small grocery store in Wau's central market, saw her daily sales increase by 40% after adopting AfraPay. "Customers love the convenience, and I don't have to worry about handling large amounts of cash," she explains.

### Agricultural Sector
Farmers in the surrounding areas are leveraging AfraPay for:
- Receiving payments for crops
- Purchasing seeds and fertilizers
- Saving for future planting seasons
- Accessing agricultural microloans

**Success Story: The Maize Cooperative**
A group of 50 maize farmers formed a cooperative and now use AfraPay to collect payments from wholesalers. "We receive our money instantly and can plan our next season better," says cooperative leader John Malual.

## Services Available in Wau

### Agent Network
We've established partnerships with:
- 25 local shops serving as cash-in/cash-out points
- 10 dedicated AfraPay service centers
- Mobile agents covering rural areas within 50km radius

### Local Language Support
- Customer service available in Arabic and local Balanda dialects
- Mobile app interface translated to local languages
- Educational materials in community languages

### Financial Education
We conduct weekly workshops covering:
- Basic digital financial literacy
- Saving and budgeting techniques
- Small business financial management
- Safe transaction practices

## Economic Transformation

Since opening in Wau, we've processed:
- Over 100,000 transactions
- $2.5 million in transaction volume
- Served 15,000+ active users
- Facilitated 500+ business loans

## Future Plans

### Expansion
- Opening 5 additional agent locations by end of 2026
- Extending mobile network coverage to remote villages
- Partnering with local NGOs for financial inclusion programs

### New Services
- Agricultural insurance products
- Group savings programs for women's cooperatives
- Educational loans for students
- Remittance services for diaspora community

### Community Investment
- Building a financial literacy center
- Supporting local entrepreneurship programs
- Sponsoring community development projects
- Creating youth employment opportunities

## Getting Started in Wau

Residents can sign up for AfraPay at any of our agent locations with:
- Valid South Sudanese ID
- Phone number
- Proof of address (utility bill or letter)

Our team in Wau is committed to serving the community and helping build a more prosperous future for Western Bahr el Ghazal.`,
    author: "Fatima Al-Rashid",
    authorRole: "Head of Operations",
    avatar: "FA",
    date: "February 20, 2026",
    readTime: "4 min read",
    featured: false,
    tagText: "Community",
    tagVariant: "warning",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=400&fit=crop",
    status: "published"
  },
  {
    category: "Finance",
    title: "5 Smart Ways to Save Money Using AfraPay Goals",
    excerpt: "Our built-in savings targets feature can help you build an emergency fund, save for school fees, or grow a small business — step by step.",
    content: `Saving money is one of the most important financial habits you can develop. AfraPay Goals makes it easier than ever to build your savings systematically. Here are five smart strategies to maximize your savings.

## 1. Build an Emergency Fund

### Why It Matters
Life is unpredictable, and having an emergency fund can provide financial security during difficult times.

### How to Use AfraPay Goals
- Set a goal for 3-6 months of expenses
- Enable automatic transfers of 10% of your income
- Choose a longer-term goal (12-18 months)
- Avoid touching this fund except for true emergencies

### Pro Tip
Start small with a goal of saving 50 SSP per week. Once this becomes a habit, gradually increase the amount.

## 2. Save for Children's Education

### Planning Ahead
Education costs continue to rise, and planning early can make a significant difference.

### Strategy
- Calculate annual school fees and supplies costs
- Set up a goal 12 months before the school year starts
- Save monthly throughout the year
- Add extra money from bonuses or seasonal income

### Example
If school fees are 2,400 SSP annually, save 200 SSP monthly starting 12 months ahead.

## 3. Grow Your Business Capital

### Business Growth Fund
Whether you're planning to expand your shop, buy more inventory, or invest in new equipment, systematic saving is key.

### Approach
- Identify specific business needs and costs
- Set a realistic timeline for your goal
- Save a percentage of daily profits
- Use seasonal business cycles to save more during peak periods

### Success Story
Trader Marium in Juba saved 50 SSP daily for 8 months to buy a motorcycle for deliveries, increasing her business reach by 300%.

## 4. Plan for Major Purchases

### Smart Buying Strategy
Instead of taking loans for major purchases, saving in advance helps you avoid interest and debt.

### Common Goals
- Motorcycle or bicycle
- Solar panel system
- Home improvements
- Electronics or appliances

### Method
- Research the exact cost of your desired purchase
- Add 10% buffer for price increases
- Set a realistic timeline
- Consider seasonal sales when timing your purchase

## 5. Create Multiple Savings Goals

### Diversify Your Savings
You can have multiple active goals for different purposes simultaneously.

### Popular Combinations
- Emergency fund (long-term, continuous)
- Holiday savings (short-term, seasonal)
- Business expansion (medium-term, specific)
- Home improvement (long-term, flexible)

### Management Tips
- Prioritize emergency fund first
- Adjust goal allocations based on changing needs
- Celebrate when you achieve each goal
- Start new goals immediately after completing others

## Maximizing Your Savings Success

### Automation Features
- Set up automatic transfers on payday
- Use percentage-based savings (save 15% of all income)
- Enable goal reminders and progress notifications

### Psychological Benefits
- Visual progress bars keep you motivated
- Achievement notifications provide positive reinforcement
- Sharing goals with family creates accountability

### Advanced Strategies
- Save windfalls (bonuses, gifts) directly to goals
- Round up purchases to the nearest 10 SSP and save the difference
- Use the "pay yourself first" principle

## Getting Started Today

1. **Open AfraPay Goals** in your mobile app
2. **Choose your first goal** (start with emergency fund)
3. **Set a realistic target** amount and timeline
4. **Enable automatic transfers** for consistency
5. **Track your progress** and celebrate milestones

Remember, the best time to start saving was yesterday, but the second-best time is today. Start with small amounts and build the habit – your future self will thank you!`,
    author: "Amina Hassan",
    authorRole: "CTO & Co-founder",
    avatar: "AH",
    date: "February 14, 2026",
    readTime: "5 min read",
    featured: false,
    tagText: "Tips",
    tagVariant: "primary",
    imageUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=400&fit=crop",
    status: "published"
  }
];

async function seedBlogPosts() {
  try {
    console.log('🌱 Seeding blog posts...');
    console.log(`📝 Preparing to add ${BLOG_POSTS.length} blog posts to collection: ${collectionId}\n`);

    let successCount = 0;
    let skipCount = 0;

    for (const post of BLOG_POSTS) {
      try {
        const slug = generateSlug(post.title);
        const publishedAt = convertToISODate(post.date);

        const documentData = {
          category: post.category,
          title: post.title,
          slug: slug,
          excerpt: post.excerpt,
          content: post.content,
          author: post.author,
          authorRole: post.authorRole,
          avatar: post.avatar,
          readTime: post.readTime,
          featured: post.featured,
          tagText: post.tagText,
          tagVariant: post.tagVariant,
          imageUrl: post.imageUrl,
          publishedAt: publishedAt,
          status: post.status
        };

        await databases.createDocument(
          databaseId,
          collectionId,
          ID.unique(),
          documentData
        );

        successCount++;
        console.log(`✅ Added: "${post.title}"`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        if (error.message?.includes('already exists') || error.message?.includes('unique')) {
          skipCount++;
          console.log(`⚠️  Skipped: "${post.title}" (already exists)`);
        } else {
          console.error(`❌ Error adding "${post.title}":`, error.message);
        }
      }
    }

    console.log(`\n🎉 Seeding completed!`);
    console.log(`✅ Successfully added: ${successCount} posts`);
    console.log(`⚠️  Skipped: ${skipCount} posts`);
    console.log(`📊 Total in collection: ${successCount + skipCount} posts`);

  } catch (error) {
    console.error('❌ Error seeding blog posts:', error);
    process.exit(1);
  }
}

// Run the seeding
seedBlogPosts();