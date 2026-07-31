import { Server } from "socket.io";

import User from "../models/user.model.js";
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import { verifyToken } from "../utils/jwt.js";

const parseCookieToken = (cookieHeader = "") => {
  const tokenPair = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith("auth_token="));

  if (!tokenPair) return null;
  return decodeURIComponent(tokenPair.split("=")[1] || "");
};

const addSocketForUser = (socketUsers, userId, socketId) => {
  const activeSockets = socketUsers.get(userId) || new Set();
  activeSockets.add(socketId);
  socketUsers.set(userId, activeSockets);
};

const removeSocketForUser = (socketUsers, userId, socketId) => {
  const activeSockets = socketUsers.get(userId);
  if (!activeSockets) return false;

  activeSockets.delete(socketId);
  if (activeSockets.size === 0) {
    socketUsers.delete(userId);
    return true;
  }

  socketUsers.set(userId, activeSockets);
  return false;
};

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, ""),
      credentials: true,
    },
  });

  const socketUsers = new Map();
  io.socketUsers = socketUsers;

  io.use((socket, next) => {
    try {
      const cookieToken = parseCookieToken(socket.handshake.headers.cookie || "");
      const bearerToken = socket.handshake.auth?.token || null;
      const token = cookieToken || bearerToken;

      if (!token) {
        next(new Error("Authentication required"));
        return;
      }

      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error("Invalid or expired socket token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.userId;
    addSocketForUser(socketUsers, userId, socket.id);

    socket.join(`user:${userId}`);

    const chats = await Chat.find({ participants: userId }).select("_id").lean();
    chats.forEach((chat) => socket.join(chat._id.toString()));

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
    });

    io.emit("presence:update", {
      userId,
      isOnline: true,
      lastSeen: new Date().toISOString(),
    });

    socket.on("typing:start", ({ chatId }) => {
      if (!chatId) return;
      socket.to(chatId).emit("typing:update", {
        chatId,
        userId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", ({ chatId }) => {
      if (!chatId) return;
      socket.to(chatId).emit("typing:update", {
        chatId,
        userId,
        isTyping: false,
      });
    });

    socket.on("chat:join", async ({ chatId }) => {
      if (!chatId) return;
      const chat = await Chat.findById(chatId).select("participants");
      if (chat && chat.participants.some((participant) => participant.toString() === userId)) {
        socket.join(chatId);
      }
    });

    socket.on("chat:leave", ({ chatId }) => {
      if (!chatId) return;
      socket.leave(chatId);
    });

    socket.on("message:delivered", async ({ chatId, messageId }) => {
      if (!chatId || !messageId) return;

      await Message.updateOne(
        {
          _id: messageId,
          chat: chatId,
          deliveredTo: { $ne: userId },
        },
        {
          $push: { deliveredTo: userId },
        },
      );

      io.to(chatId).emit("message:delivery-update", {
        chatId,
        messageId,
        userId,
        type: "delivered",
      });
    });

    socket.on("message:read", async ({ chatId, messageIds = [] }) => {
      if (!chatId || !Array.isArray(messageIds) || messageIds.length === 0) return;

      await Message.updateMany(
        {
          _id: { $in: messageIds },
          chat: chatId,
          "readBy.user": { $ne: userId },
        },
        {
          $push: {
            readBy: {
              user: userId,
              readAt: new Date(),
            },
          },
        },
      );

      io.to(chatId).emit("message:delivery-update", {
        chatId,
        messageIds,
        userId,
        type: "read",
      });
    });

    socket.on("disconnect", async () => {
      const isLastConnection = removeSocketForUser(socketUsers, userId, socket.id);
      if (!isLastConnection) return;

      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen,
      });

      io.emit("presence:update", {
        userId,
        isOnline: false,
        lastSeen: lastSeen.toISOString(),
      });
    });
  });

  return io;
};
