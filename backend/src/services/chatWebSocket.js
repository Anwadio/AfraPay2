/**
 * Chat WebSocket Handler
 *
 * Handles real-time chat functionality via WebSocket connections:
 *   - Join/leave chat rooms
 *   - Send/receive messages
 *   - Typing indicators
 *   - Online status tracking
 *   - Admin dashboard integration
 *
 * Events:
 *   Client -> Server:
 *     - join_chat: Join a chat session
 *     - send_message: Send a message
 *     - typing: Typing indicator
 *     - leave_chat: Leave a chat session
 *
 *   Server -> Client:
 *     - new_message: New message received
 *     - admin_typing: Admin is typing
 *     - admin_status: Admin online/offline
 *     - chat_joined: Successfully joined chat
 *     - user_joined: User joined chat (admin only)
 *     - user_left: User left chat (admin only)
 */

"use strict";

const logger = require("../utils/logger");
const chatController = require("../controllers/chatController");

class ChatWebSocketHandler {
  constructor(io) {
    this.io = io;
    this.chatRooms = new Map(); // sessionId -> { users: [], admins: [], lastActivity: Date }
    this.userSessions = new Map(); // userId -> sessionId
    this.adminStatus = new Map(); // adminId -> { online: boolean, lastSeen: Date }

    this.setupChatHandlers();
  }

  setupChatHandlers() {
    this.io.on("connection", (socket) => {
      logger.debug("Client connected to chat handler", {
        socketId: socket.id,
        userId: socket.user?.id,
        isGuest: !socket.user,
      });

      // Join chat session
      socket.on("join_chat", (data) => {
        this.handleJoinChat(socket, data);
      });

      // Send message
      socket.on("send_message", (data) => {
        this.handleSendMessage(socket, data);
      });

      // Typing indicator
      socket.on("typing", (data) => {
        this.handleTyping(socket, data);
      });

      // Leave chat
      socket.on("leave_chat", (data) => {
        this.handleLeaveChat(socket, data);
      });

      // Admin status update (admin dashboard)
      socket.on("admin_status", (data) => {
        this.handleAdminStatus(socket, data);
      });

      // Disconnect
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });
    });

    logger.info("Chat WebSocket handlers configured");
  }

  handleJoinChat(socket, data) {
    const { sessionId, userType = "customer" } = data;

    if (!sessionId) {
      socket.emit("error", { message: "Session ID is required" });
      return;
    }

    try {
      // Join the socket room
      socket.join(sessionId);
      socket.currentChatSession = sessionId;
      socket.userType = userType;

      // Initialize room if it doesn't exist
      if (!this.chatRooms.has(sessionId)) {
        this.chatRooms.set(sessionId, {
          users: [],
          admins: [],
          lastActivity: new Date(),
        });
      }

      const room = this.chatRooms.get(sessionId);

      // Add user to room tracking
      if (userType === "admin") {
        const adminInfo = {
          socketId: socket.id,
          adminId: socket.user?.id,
          adminName: socket.user?.name,
          joinedAt: new Date(),
        };
        room.admins.push(adminInfo);

        // Update admin online status
        if (socket.user?.id) {
          this.adminStatus.set(socket.user.id, {
            online: true,
            lastSeen: new Date(),
          });
        }

        // Notify users that admin is online
        socket.to(sessionId).emit("admin_status", { online: true });
      } else {
        const userInfo = {
          socketId: socket.id,
          userId: socket.user?.id || null,
          userName: socket.user?.name || "Guest User",
          joinedAt: new Date(),
        };
        room.users.push(userInfo);

        // Track user's active session
        if (socket.user?.id) {
          this.userSessions.set(socket.user.id, sessionId);
        }

        // Notify admins that user joined
        room.admins.forEach((admin) => {
          this.io.to(admin.socketId).emit("user_joined", {
            sessionId,
            user: userInfo,
          });
        });
      }

      room.lastActivity = new Date();

      socket.emit("chat_joined", {
        sessionId,
        userType,
        participantCount: room.users.length + room.admins.length,
        adminOnline: room.admins.length > 0,
      });

      logger.info("User joined chat", {
        sessionId,
        socketId: socket.id,
        userId: socket.user?.id,
        userType,
        participantCount: room.users.length + room.admins.length,
      });
    } catch (error) {
      logger.error("Error joining chat", { error: error.message, sessionId });
      socket.emit("error", { message: "Failed to join chat session" });
    }
  }

  handleSendMessage(socket, data) {
    const { sessionId, message, userType = "customer" } = data;

    if (!sessionId || !message?.trim()) {
      socket.emit("error", { message: "Session ID and message are required" });
      return;
    }

    if (socket.currentChatSession !== sessionId) {
      socket.emit("error", { message: "You must join the chat session first" });
      return;
    }

    try {
      const room = this.chatRooms.get(sessionId);
      if (!room) {
        socket.emit("error", { message: "Chat session not found" });
        return;
      }

      // Create message object for real-time broadcast
      const messageObj = {
        sessionId,
        sender: userType,
        senderId: socket.user?.id || null,
        senderName: socket.user?.name || "Guest User",
        message: message.trim(),
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all participants in the session
      this.io.to(sessionId).emit("new_message", { message: messageObj });

      room.lastActivity = new Date();

      logger.info("Message sent via WebSocket", {
        sessionId,
        senderId: socket.user?.id,
        senderType: userType,
        messageLength: message.length,
      });
    } catch (error) {
      logger.error("Error sending message", {
        error: error.message,
        sessionId,
      });
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  handleTyping(socket, data) {
    const { sessionId, isTyping, userType = "customer" } = data;

    if (!sessionId || socket.currentChatSession !== sessionId) {
      return;
    }

    try {
      const room = this.chatRooms.get(sessionId);
      if (!room) return;

      // Emit typing status to other participants
      if (userType === "admin") {
        // Admin typing - notify users
        room.users.forEach((user) => {
          this.io.to(user.socketId).emit("admin_typing", { isTyping });
        });
      } else {
        // User typing - notify admins
        room.admins.forEach((admin) => {
          this.io.to(admin.socketId).emit("user_typing", {
            sessionId,
            userId: socket.user?.id,
            userName: socket.user?.name || "Guest User",
            isTyping,
          });
        });
      }
    } catch (error) {
      logger.error("Error handling typing", {
        error: error.message,
        sessionId,
      });
    }
  }

  handleLeaveChat(socket, data) {
    const { sessionId } = data;
    this.leaveChatSession(socket, sessionId);
  }

  handleAdminStatus(socket, data) {
    const { online } = data;

    if (
      !socket.user ||
      (socket.user.role !== "admin" && socket.user.role !== "super_admin")
    ) {
      return;
    }

    try {
      this.adminStatus.set(socket.user.id, {
        online: !!online,
        lastSeen: new Date(),
      });

      // Notify all users in chat sessions about admin status change
      this.chatRooms.forEach((room, sessionId) => {
        room.users.forEach((user) => {
          this.io.to(user.socketId).emit("admin_status", { online: !!online });
        });
      });

      logger.info("Admin status updated", {
        adminId: socket.user.id,
        online: !!online,
      });
    } catch (error) {
      logger.error("Error updating admin status", { error: error.message });
    }
  }

  handleDisconnect(socket) {
    try {
      // Leave current chat session if any
      if (socket.currentChatSession) {
        this.leaveChatSession(socket, socket.currentChatSession);
      }

      // Update admin offline status
      if (
        socket.user &&
        (socket.user.role === "admin" || socket.user.role === "super_admin")
      ) {
        this.adminStatus.set(socket.user.id, {
          online: false,
          lastSeen: new Date(),
        });

        // Notify users that admin went offline
        this.chatRooms.forEach((room, sessionId) => {
          // Check if any other admins are online in this room
          const hasOnlineAdmin = room.admins.some(
            (admin) =>
              admin.adminId !== socket.user.id &&
              this.adminStatus.get(admin.adminId)?.online,
          );

          if (!hasOnlineAdmin) {
            room.users.forEach((user) => {
              this.io.to(user.socketId).emit("admin_status", { online: false });
            });
          }
        });
      }

      logger.debug("Client disconnected from chat", {
        socketId: socket.id,
        userId: socket.user?.id,
        sessionId: socket.currentChatSession,
      });
    } catch (error) {
      logger.error("Error handling chat disconnect", { error: error.message });
    }
  }

  leaveChatSession(socket, sessionId) {
    if (!sessionId) return;

    try {
      socket.leave(sessionId);

      const room = this.chatRooms.get(sessionId);
      if (!room) return;

      // Remove from room tracking
      if (socket.userType === "admin") {
        room.admins = room.admins.filter(
          (admin) => admin.socketId !== socket.id,
        );

        // Notify users if no admins left
        if (room.admins.length === 0) {
          room.users.forEach((user) => {
            this.io.to(user.socketId).emit("admin_status", { online: false });
          });
        }
      } else {
        room.users = room.users.filter((user) => user.socketId !== socket.id);

        // Remove from user sessions tracking
        if (socket.user?.id) {
          this.userSessions.delete(socket.user.id);
        }

        // Notify admins that user left
        room.admins.forEach((admin) => {
          this.io.to(admin.socketId).emit("user_left", {
            sessionId,
            userId: socket.user?.id,
            userName: socket.user?.name || "Guest User",
          });
        });
      }

      // Clean up empty rooms
      if (room.users.length === 0 && room.admins.length === 0) {
        this.chatRooms.delete(sessionId);
      }

      socket.currentChatSession = null;
      socket.userType = null;

      logger.info("User left chat", {
        sessionId,
        socketId: socket.id,
        userId: socket.user?.id,
        remainingUsers: room.users.length,
        remainingAdmins: room.admins.length,
      });
    } catch (error) {
      logger.error("Error leaving chat session", {
        error: error.message,
        sessionId,
      });
    }
  }

  // Admin dashboard helpers
  getActiveChats() {
    const activeChats = [];

    this.chatRooms.forEach((room, sessionId) => {
      if (room.users.length > 0) {
        activeChats.push({
          sessionId,
          userCount: room.users.length,
          adminCount: room.admins.length,
          lastActivity: room.lastActivity,
          users: room.users.map((user) => ({
            userId: user.userId,
            userName: user.userName,
            joinedAt: user.joinedAt,
          })),
        });
      }
    });

    return activeChats;
  }

  getOnlineAdmins() {
    const onlineAdmins = [];

    this.adminStatus.forEach((status, adminId) => {
      if (status.online) {
        onlineAdmins.push({
          adminId,
          lastSeen: status.lastSeen,
        });
      }
    });

    return onlineAdmins;
  }
}

module.exports = ChatWebSocketHandler;
