/**
 * ChatController
 *
 * Manages real-time chat system:
 *   Sessions    — create, list, view details, update status
 *   Messages    — send, retrieve, mark as read
 *   Presence    — online/offline status for admins and users
 *   Analytics   — response times, session metrics
 *
 * Appwrite collections required (IDs via env):
 *   APPWRITE_CHAT_SESSIONS_COLLECTION_ID
 *   APPWRITE_CHAT_MESSAGES_COLLECTION_ID
 *
 * Access-control:
 *   Customers can create sessions and participate in their own chats
 *   Admins can access all chats and respond to any session
 *   WebSocket integration for real-time messaging
 */

"use strict";

const { Client, Databases, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} = require("../middleware/monitoring/errorHandler");

// ── Appwrite client ──────────────────────────────────────────────────────────
const _client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const db = new Databases(_client);

// ── Collection accessors ─────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const CHAT_SESSIONS = () => config.database.appwrite.chatSessionsCollectionId;
const CHAT_MESSAGES = () => config.database.appwrite.chatMessagesCollectionId;

class ChatController {
  /**
   * Create a new chat session
   * @route   POST /api/v1/chat/session
   * @access  Public (for guests) / Private (for authenticated users)
   */
  async createSession(req, res) {
    if (!CHAT_SESSIONS()) {
      throw new ValidationError("Chat service is temporarily unavailable.");
    }

    const now = new Date().toISOString();
    const isAuthenticated = !!req.user;

    const sessionData = {
      userId: isAuthenticated ? req.user.id : "guest",
      userEmail: isAuthenticated ? req.user.email : "guest@guest.local",
      userName: isAuthenticated ? req.user.name : "Guest User",
      status: "waiting", // waiting, active, ended
      messageCount: 0,
      isGuestSession: !isAuthenticated,
      adminId: "unassigned",
      adminName: "Unassigned",
      lastActivity: now,
      source: "website_chat",
      endedAt: "1970-01-01T00:00:00.000Z", // Default date for active sessions
      endedBy: "none", // Default for active sessions
      endReason: "none", // Default for active sessions
      adminNote: "none", // Default empty note
      $createdAt: now,
      $updatedAt: now,
    };

    const session = await db.createDocument(
      DB(),
      CHAT_SESSIONS(),
      ID.unique(),
      sessionData,
    );

    logger.info("Chat session created", {
      sessionId: session.$id,
      userId: sessionData.userId,
      isGuest: sessionData.isGuestSession,
    });

    return res.status(201).json({
      success: true,
      data: {
        sessionId: session.$id,
        status: session.status,
        messageCount: session.messageCount,
        isGuestSession: session.isGuestSession,
      },
      message: "Chat session created successfully",
    });
  }

  /**
   * Get messages for a chat session
   * @route   GET /api/v1/chat/sessions/:sessionId/messages
   * @access  Private (user can access own session, admin can access any)
   */
  async getMessages(req, res) {
    const { sessionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!CHAT_MESSAGES() || !CHAT_SESSIONS()) {
      throw new ValidationError("Chat service is temporarily unavailable.");
    }

    // Verify session exists and user has access
    const session = await db.getDocument(DB(), CHAT_SESSIONS(), sessionId);

    if (!session) {
      throw new NotFoundError("Chat session not found.");
    }

    // Access control: users can only access their own sessions, admins can access any
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "super_admin";
    const isOwner = req.user?.id === session.userId;
    const isGuestSession = session.isGuestSession && !req.user;

    if (!isAdmin && !isOwner && !isGuestSession) {
      throw new AuthorizationError(
        "You can only access your own chat sessions.",
      );
    }

    // Get messages for this session
    const messages = await db.listDocuments(DB(), CHAT_MESSAGES(), [
      Query.equal("sessionId", sessionId),
      Query.orderDesc("$createdAt"),
      Query.limit(Math.min(parseInt(limit), 100)),
      Query.offset(parseInt(offset)),
    ]);

    // Reverse to show chronological order (oldest first)
    const chronologicalMessages = messages.documents.reverse();

    return res.json({
      success: true,
      data: {
        messages: chronologicalMessages,
        count: messages.total,
        hasMore:
          parseInt(offset) + chronologicalMessages.length < messages.total,
      },
      message: "Messages retrieved successfully",
    });
  }

  /**
   * Send a message in a chat session
   * @route   POST /api/v1/chat/sessions/:sessionId/messages
   * @access  Private
   */
  async sendMessage(req, res) {
    const { sessionId } = req.params;
    const { message, sender = "customer" } = req.body;

    if (!message || !message.trim()) {
      throw new ValidationError("Message content is required.");
    }

    if (!CHAT_MESSAGES() || !CHAT_SESSIONS()) {
      throw new ValidationError("Chat service is temporarily unavailable.");
    }

    // Verify session exists
    const session = await db.getDocument(DB(), CHAT_SESSIONS(), sessionId);

    if (!session) {
      throw new NotFoundError("Chat session not found.");
    }

    // Access control and sender validation
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "super_admin";
    const isOwner = req.user?.id === session.userId;
    const isGuestSession = session.isGuestSession && !req.user;

    if (!isAdmin && !isOwner && !isGuestSession) {
      throw new AuthorizationError(
        "You can only send messages in your own chat sessions.",
      );
    }

    // Determine sender type
    let senderType, senderName, senderId;

    if (isAdmin && sender === "admin") {
      senderType = "admin";
      senderName = req.user.name;
      senderId = req.user.id;
    } else {
      senderType = "customer";
      senderName = req.user ? req.user.name : "Guest User";
      senderId = req.user ? req.user.id : "guest";
    }

    const now = new Date().toISOString();

    // Create message
    const messageData = {
      sessionId,
      sender: senderType,
      senderId,
      senderName,
      message: message.trim(),
      isRead: false,
      editedAt: "1970-01-01T00:00:00.000Z", // Default date for unedited messages
      $createdAt: now,
      $updatedAt: now,
    };

    const newMessage = await db.createDocument(
      DB(),
      CHAT_MESSAGES(),
      ID.unique(),
      messageData,
    );

    // Update session
    await db.updateDocument(DB(), CHAT_SESSIONS(), sessionId, {
      messageCount: session.messageCount + 1,
      lastActivity: now,
      status: senderType === "admin" ? "active" : session.status,
      adminId: senderType === "admin" ? senderId : session.adminId,
      adminName: senderType === "admin" ? senderName : session.adminName,
      $updatedAt: now,
    });

    logger.info("Chat message sent", {
      sessionId,
      messageId: newMessage.$id,
      sender: senderType,
      senderId,
    });

    return res.status(201).json({
      success: true,
      data: {
        messageId: newMessage.$id,
        message: newMessage,
      },
      message: "Message sent successfully",
    });
  }

  /**
   * Get active chat sessions (primarily for admin dashboard)
   * @route   GET /api/v1/chat/sessions
   * @access  Private (admin only)
   */
  async getActiveSessions(req, res) {
    const { limit = 20, offset = 0, status = "all" } = req.query;

    if (!CHAT_SESSIONS()) {
      throw new ValidationError("Chat service is temporarily unavailable.");
    }

    // Only admins can view all sessions
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "super_admin";

    if (!isAdmin) {
      throw new AuthorizationError(
        "Only administrators can view all chat sessions.",
      );
    }

    let queries = [
      Query.orderDesc("$createdAt"),
      Query.limit(Math.min(parseInt(limit), 100)),
      Query.offset(parseInt(offset)),
    ];

    // Filter by status if specified
    if (status && status !== "all") {
      queries.push(Query.equal("status", status));
    }

    const sessions = await db.listDocuments(DB(), CHAT_SESSIONS(), queries);

    return res.json({
      success: true,
      data: {
        sessions: sessions.documents,
        count: sessions.total,
        hasMore: parseInt(offset) + sessions.documents.length < sessions.total,
      },
      message: "Chat sessions retrieved successfully",
    });
  }

  /**
   * Update chat session status
   * @route   PATCH /api/v1/chat/sessions/:sessionId
   * @access  Private (admin only)
   */
  async updateSession(req, res) {
    const { sessionId } = req.params;
    const { status, adminNote } = req.body;

    if (!CHAT_SESSIONS()) {
      throw new ValidationError("Chat service is temporarily unavailable.");
    }

    // Only admins can update sessions
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "super_admin";

    if (!isAdmin) {
      throw new AuthorizationError(
        "Only administrators can update chat sessions.",
      );
    }

    // Verify session exists
    const session = await db.getDocument(DB(), CHAT_SESSIONS(), sessionId);

    if (!session) {
      throw new NotFoundError("Chat session not found.");
    }

    const updateData = {
      $updatedAt: new Date().toISOString(),
    };

    if (status && ["waiting", "active", "ended"].includes(status)) {
      updateData.status = status;
    }

    if (adminNote) {
      updateData.adminNote = adminNote.trim();
    }

    const updatedSession = await db.updateDocument(
      DB(),
      CHAT_SESSIONS(),
      sessionId,
      updateData,
    );

    logger.info("Chat session updated", {
      sessionId,
      adminId: req.user.id,
      status: updateData.status,
    });

    return res.json({
      success: true,
      data: updatedSession,
      message: "Chat session updated successfully",
    });
  }

  /**
   * Get chat session details
   * @route   GET /api/v1/chat/sessions/:sessionId
   * @access  Private
   */
  async getSessionDetails(req, res) {
    const { sessionId } = req.params;

    if (!CHAT_SESSIONS()) {
      throw new ValidationError("Chat service is temporarily unavailable.");
    }

    const session = await db.getDocument(DB(), CHAT_SESSIONS(), sessionId);

    if (!session) {
      throw new NotFoundError("Chat session not found.");
    }

    // Access control
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "super_admin";
    const isOwner = req.user?.id === session.userId;
    const isGuestSession = session.isGuestSession && !req.user;

    if (!isAdmin && !isOwner && !isGuestSession) {
      throw new AuthorizationError(
        "You can only access your own chat sessions.",
      );
    }

    return res.json({
      success: true,
      data: session,
      message: "Chat session details retrieved successfully",
    });
  }

  /**
   * End a chat session
   * @route   POST /api/v1/chat/sessions/:sessionId/end
   * @access  Private
   */
  async endSession(req, res) {
    const { sessionId } = req.params;
    const { reason = "user_request" } = req.body;

    if (!CHAT_SESSIONS()) {
      throw new ValidationError("Chat service is temporarily unavailable.");
    }

    const session = await db.getDocument(DB(), CHAT_SESSIONS(), sessionId);

    if (!session) {
      throw new NotFoundError("Chat session not found.");
    }

    // Access control
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "super_admin";
    const isOwner = req.user?.id === session.userId;

    if (!isAdmin && !isOwner) {
      throw new AuthorizationError("You can only end your own chat sessions.");
    }

    const now = new Date().toISOString();

    const updatedSession = await db.updateDocument(
      DB(),
      CHAT_SESSIONS(),
      sessionId,
      {
        status: "ended",
        endedAt: now,
        endedBy: req.user ? req.user.id : "guest",
        endReason: reason,
        $updatedAt: now,
      },
    );

    logger.info("Chat session ended", {
      sessionId,
      endedBy: req.user ? req.user.id : "guest",
      reason,
    });

    return res.json({
      success: true,
      data: updatedSession,
      message: "Chat session ended successfully",
    });
  }
}

module.exports = new ChatController();
