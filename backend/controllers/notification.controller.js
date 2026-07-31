import Notification from "../models/notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user.userId })
    .populate("actor", "name username profilePicture")
    .populate("chat", "name isGroup")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  res.json({
    status: "success",
    data: notifications,
    meta: { unreadCount },
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user.userId, isRead: false }, { $set: { isRead: true } });

  res.json({
    status: "success",
    message: "Notifications marked as read.",
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    {
      _id: req.params.notificationId,
      user: req.user.userId,
    },
    { $set: { isRead: true } },
  );

  res.json({
    status: "success",
    message: "Notification marked as read.",
  });
});
