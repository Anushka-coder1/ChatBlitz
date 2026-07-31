import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import { uploadMiddleware } from "../config/cloudinary.js";
import {
  createDirectChat,
  createGroupChat,
  deleteGroup,
  deleteMessage,
  editMessage,
  getChatAttachments,
  getChats,
  getMessages,
  leaveGroup,
  markChatAsRead,
  sendMessage,
  updateGroup,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/direct", createDirectChat);
router.post("/group", createGroupChat);
router.get("/", getChats);
router.get("/:chatId/messages", getMessages);
router.post("/:chatId/messages", uploadMiddleware.array("files", 6), sendMessage);
router.patch("/:chatId/messages/:messageId", editMessage);
router.delete("/:chatId/messages/:messageId", deleteMessage);
router.patch("/:chatId/read", markChatAsRead);
router.patch("/:chatId/group", updateGroup);
router.post("/:chatId/group/leave", leaveGroup);
router.delete("/:chatId/group", deleteGroup);
router.get("/:chatId/attachments", getChatAttachments);

export default router;
