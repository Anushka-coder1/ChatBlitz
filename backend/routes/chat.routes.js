import express from "express";
import { sendMessage, getConversation, getMessages, markAsRead ,deleteMessage } from "../controllers/chat.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { multerMiddleware } from "../config/cloudinary.js";

const router = express.Router();

router.post("/send-message",authMiddleware , multerMiddleware , sendMessage);
router.get("/conversation",authMiddleware, getConversation)
router.get("/conversation/:conversationId/messages",authMiddleware, getMessages)

router.put('/messages/read', authMiddleware, markAsRead)
router.delete('/messages/:messageId', authMiddleware, deleteMessage)

export default router;
