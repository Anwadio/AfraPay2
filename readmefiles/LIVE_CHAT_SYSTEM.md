# AfraPay Live Chat System

## 🚀 Complete Real-Time Customer Support Solution

A comprehensive live chat system built with **Socket.IO**, **React**, **Node.js/Express**, and **Appwrite** database, providing real-time customer support with professional UI and full admin dashboard readiness.

---

## ✨ Features

### **Customer Features**

- ✅ **Real-time messaging** with instant delivery
- ✅ **Guest support** - No authentication required
- ✅ **Typing indicators** - See when agents are typing
- ✅ **Agent status tracking** - Live availability indicators
- ✅ **Message history** - Persistent chat sessions
- ✅ **Professional UI** - AfraPay branded interface
- ✅ **Responsive design** - Works on all devices
- ✅ **Auto-scroll** - Automatic message scrolling
- ✅ **Connection status** - Real-time connection feedback
- ✅ **Send on Enter** - Keyboard shortcuts for messaging

### **Technical Features**

- ✅ **Socket.IO integration** - Reliable WebSocket communication
- ✅ **Database persistence** - All messages stored in Appwrite
- ✅ **Session management** - Unique session tracking
- ✅ **Error handling** - Graceful fallbacks and error recovery
- ✅ **Rate limiting** - Protection against spam
- ✅ **Input validation** - Secure message processing
- ✅ **Optional authentication** - Supports both guests and users
- ✅ **Admin dashboard ready** - Complete infrastructure for admin interface

---

## 🏗️ Architecture

### **Frontend Stack**

- **React 18** - Modern UI library
- **Socket.IO Client** - Real-time communication
- **Tailwind CSS** - Responsive styling
- **React Hot Toast** - User notifications

### **Backend Stack**

- **Node.js/Express** - Web server framework
- **Socket.IO Server** - WebSocket management
- **Appwrite** - Database and authentication
- **JWT** - Token-based authentication
- **express-validator** - Input validation
- **express-rate-limit** - Rate limiting

### **Database Schema (Appwrite)**

```javascript
// Chat Sessions Collection
{
  sessionId: string (unique),
  userId: string (guest for anonymous),
  userEmail: string (guest@guest.local for anonymous),
  status: string (waiting|active|ended),
  messageCount: number,
  createdAt: datetime,
  updatedAt: datetime,
  endedBy: string (customer|admin|system|none),
  endedAt: datetime
}

// Chat Messages Collection
{
  messageId: string (unique),
  sessionId: string,
  message: string,
  sender: string (customer|admin),
  timestamp: datetime,
  isRead: boolean
}
```

---

## 🛠️ Setup & Installation

### **Prerequisites**

- Node.js 16+ installed
- Appwrite server running
- Environment variables configured

### **Backend Setup**

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   ```env
   # .env file
   APPWRITE_ENDPOINT=https://your-appwrite-endpoint
   APPWRITE_PROJECT_ID=your-project-id
   APPWRITE_API_KEY=your-api-key
   APPWRITE_CHAT_SESSIONS_COLLECTION=your-sessions-collection-id
   APPWRITE_CHAT_MESSAGES_COLLECTION=your-messages-collection-id
   ```

4. **Setup database collections:**

   ```bash
   node src/scripts/setup-chat-collections.js
   ```

5. **Start the server:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### **Frontend Setup**

1. **Navigate to frontend directory:**

   ```bash
   cd Website
   ```

2. **Install dependencies:**

   ```bash
   npm install
   npm install socket.io-client
   ```

3. **Configure environment variables:**

   ```env
   # .env file
   REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
   ```

4. **Start the frontend:**
   ```bash
   npm start
   ```

---

## 🔌 API Endpoints

### **Chat Session Management**

```http
POST   /api/v1/chat/session              # Create new chat session
GET    /api/v1/chat/sessions             # Get all sessions (admin)
GET    /api/v1/chat/sessions/:id         # Get session details
PATCH  /api/v1/chat/sessions/:id         # Update session status (admin)
POST   /api/v1/chat/sessions/:id/end     # End chat session
```

### **Message Management**

```http
GET    /api/v1/chat/sessions/:id/messages    # Get session messages
POST   /api/v1/chat/sessions/:id/messages    # Send message
```

### **Request Examples**

```javascript
// Create Session
POST /api/v1/chat/session
Response: {
  success: true,
  data: {
    sessionId: "unique-session-id",
    status: "waiting",
    messageCount: 0,
    createdAt: "2026-03-19T10:00:00.000Z"
  }
}

// Send Message
POST /api/v1/chat/sessions/session-id/messages
Body: {
  message: "Hello, I need help with my account",
  sender: "customer"
}
```

---

## 🔄 WebSocket Events

### **Client → Server Events**

```javascript
// Join chat session
socket.emit("join_chat", {
  sessionId: "session-id",
  userType: "customer",
});

// Send message
socket.emit("send_message", {
  sessionId: "session-id",
  message: "Hello world",
  userType: "customer",
});

// Typing indicator
socket.emit("typing", {
  sessionId: "session-id",
  userType: "customer",
  isTyping: true,
});
```

### **Server → Client Events**

```javascript
// New message received
socket.on("new_message", (data) => {
  console.log("Message:", data.message);
});

// Admin typing status
socket.on("admin_typing", (data) => {
  console.log("Admin typing:", data.isTyping);
});

// Admin online status
socket.on("admin_status", (data) => {
  console.log("Admin online:", data.online);
});

// Chat room joined
socket.on("chat_joined", () => {
  console.log("Successfully joined chat");
});
```

---

## 🎨 Frontend Components

### **LiveChat Component**

**Location:** `Website/src/components/chat/LiveChat.jsx`

**Props:**

- `isOpen`: Boolean - Controls chat visibility
- `onClose`: Function - Close chat handler

**Features:**

- Real-time Socket.IO connection
- Message state management
- Typing indicators
- Auto-scroll functionality
- Professional AfraPay branding

**Usage:**

```jsx
import LiveChat from "./components/chat/LiveChat";

function App() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div>
      {/* Your app content */}
      <LiveChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
```

### **Integration Example (Contact Page)**

```jsx
// Contact.jsx
import { useState } from "react";
import LiveChat from "../components/chat/LiveChat";

export default function Contact() {
  const [liveChatOpen, setLiveChatOpen] = useState(false);

  return (
    <div>
      {/* Contact content */}

      <button
        onClick={() => setLiveChatOpen(true)}
        className="live-chat-button"
      >
        💬 Live Chat
      </button>

      <LiveChat isOpen={liveChatOpen} onClose={() => setLiveChatOpen(false)} />
    </div>
  );
}
```

---

## 🔧 Backend Services

### **Chat Controller**

**Location:** `backend/src/controllers/chatController.js`

**Methods:**

- `createSession()` - Create new chat session
- `getActiveSessions()` - Get all chat sessions (admin)
- `getSessionDetails()` - Get specific session
- `updateSession()` - Update session status
- `endSession()` - End chat session
- `getMessages()` - Get session messages
- `sendMessage()` - Send message to session

### **WebSocket Handler**

**Location:** `backend/src/services/chatWebSocket.js`

**Features:**

- Real-time event handling
- Room management
- Typing indicators
- Admin presence tracking
- Message broadcasting

### **Routes Configuration**

**Location:** `backend/src/routes/v1/chat.js`

**Security Features:**

- Rate limiting (30 req/min for chat, 60 req/min for messages)
- Input validation
- Optional authentication for guests
- Admin-only endpoints protection

---

## 📊 Database Setup

### **Chat Collections Script**

**Location:** `backend/src/scripts/setup-chat-collections.js`

**Run Setup:**

```bash
cd backend
node src/scripts/setup-chat-collections.js
```

**Collections Created:**

1. **Chat Sessions** - User chat session tracking
2. **Chat Messages** - Individual message storage

**Features:**

- Proper indexes for performance
- Read/write permissions configured
- Required field validation
- Relationship mappings

---

## 🧪 Testing

### **Manual Testing Checklist**

- [ ] **Connection Test** - Open chat and verify Socket.IO connection
- [ ] **Session Creation** - Verify new session creation
- [ ] **Message Sending** - Test bi-directional messaging
- [ ] **Message Persistence** - Refresh and check message history
- [ ] **Typing Indicators** - Test typing event transmission
- [ ] **Guest Support** - Test without authentication
- [ ] **Connection Recovery** - Test reconnection after network issues
- [ ] **UI/UX** - Test responsive design and interactions

### **Backend Testing**

```bash
cd backend

# Test health endpoint
curl http://localhost:5000/health

# Test session creation
curl -X POST http://localhost:5000/api/v1/chat/session

# Test message sending
curl -X POST http://localhost:5000/api/v1/chat/sessions/SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message", "sender": "customer"}'
```

---

## 🔮 Admin Dashboard Preparation

### **Ready Infrastructure**

✅ **Session Management API** - View all active chats  
✅ **Message History API** - Access complete chat logs  
✅ **Real-time Events** - Receive customer messages instantly  
✅ **Admin WebSocket Events** - Send responses and typing indicators  
✅ **Status Management** - Update admin availability  
✅ **Session Control** - End chats and manage queues

### **Required Admin Features (Future)**

- [ ] **Admin Dashboard UI** - React admin interface
- [ ] **Multi-agent Support** - Handle multiple admins
- [ ] **Queue Management** - Customer waiting queue
- [ ] **Canned Responses** - Pre-written response templates
- [ ] **File Sharing** - Document and image support
- [ ] **Chat Analytics** - Performance metrics and reports
- [ ] **Admin Authentication** - Secure admin login system

### **Admin WebSocket Events (Ready)**

```javascript
// Admin joins system
socket.emit("admin_join", { adminId: "admin-id" });

// Admin takes chat session
socket.emit("admin_take_session", {
  sessionId: "session-id",
  adminId: "admin-id",
});

// Admin sends message
socket.emit("admin_send_message", {
  sessionId: "session-id",
  message: "Hello! How can I help you?",
  adminId: "admin-id",
});

// Admin typing indicator
socket.emit("admin_typing", {
  sessionId: "session-id",
  isTyping: true,
});
```

---

## 🚨 Troubleshooting

### **Common Issues**

**1. WebSocket Connection Failures**

```javascript
// Check server URL configuration
const serverUrl =
  process.env.REACT_APP_API_BASE_URL?.replace("/api/v1", "") ||
  "http://localhost:5000";
```

**2. Database Connection Issues**

```bash
# Verify Appwrite environment variables
echo $APPWRITE_ENDPOINT
echo $APPWRITE_PROJECT_ID

# Test database connection
node src/scripts/test-appwrite-connection.js
```

**3. Authentication Errors**

```javascript
// Check optional authentication middleware
// backend/src/middleware/auth/authenticate.js
function optionalAuthenticateWebSocket(socket, next) {
  // Allows both authenticated and guest users
}
```

**4. Message Not Persisting**

- Verify Appwrite collection permissions
- Check database field validation
- Ensure proper session ID mapping

**5. Real-time Events Not Working**

- Confirm Socket.IO server is running
- Check client-server event name matching
- Verify WebSocket authentication middleware

---

## 📝 Development Notes

### **Code Structure**

```
├── Website/src/components/chat/
│   └── LiveChat.jsx              # Main chat component
├── Website/src/services/
│   └── api.js                    # Chat API integration
├── backend/src/controllers/
│   └── chatController.js         # Chat business logic
├── backend/src/services/
│   └── chatWebSocket.js          # WebSocket event handling
├── backend/src/routes/v1/
│   └── chat.js                   # Chat API routes
├── backend/src/middleware/auth/
│   └── authenticate.js           # Optional auth middleware
└── backend/src/scripts/
    └── setup-chat-collections.js # Database setup
```

### **Environment Configuration**

```env
# Backend (.env)
APPWRITE_ENDPOINT=your-appwrite-url
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_CHAT_SESSIONS_COLLECTION=chat-sessions-id
APPWRITE_CHAT_MESSAGES_COLLECTION=chat-messages-id

# Frontend (.env)
REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
```

### **Performance Considerations**

- **Rate Limiting**: 30 requests/minute for chat operations
- **Message History**: Paginated with 50 messages per request
- **WebSocket Rooms**: Session-based room management
- **Database Indexes**: Optimized for sessionId and timestamp queries
- **Memory Management**: Proper cleanup on disconnect events

---

## 🎉 Conclusion

The AfraPay Live Chat System is a **production-ready** real-time customer support solution featuring:

- ✅ **Complete real-time communication** with Socket.IO
- ✅ **Professional UI/UX** with AfraPay branding
- ✅ **Guest and authenticated user support**
- ✅ **Comprehensive backend infrastructure**
- ✅ **Database persistence** with Appwrite
- ✅ **Admin dashboard ready** architecture
- ✅ **Security features** and rate limiting
- ✅ **Error handling** and connection recovery
- ✅ **Responsive design** for all devices
- ✅ **Easy integration** with existing applications

**Ready for production deployment** and **admin dashboard integration**! 🚀

---

**Documentation Version:** 1.0.0  
**Last Updated:** March 19, 2026  
**System Status:** ✅ Fully Operational
