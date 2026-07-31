import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notification.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);

export default router;
