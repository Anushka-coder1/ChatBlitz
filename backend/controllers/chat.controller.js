import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { deleteCloudinaryFile, uploadFileToCloudinary } from "../config/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { ensureArray } from "../utils/validators.js";

const chatListPopulation = [
  { path: "participants", select: "name username email profilePicture isOnline lastSeen bio" },
  { path: "admins", select: "name username profilePicture" },
  { path: "owner", select: "name username profilePicture" },
  {
    path: "lastMessage",
    populate: { path: "sender", select: "name username profilePicture" },
  },
];

const messagePopulation = [
  { path: "sender", select: "name username profilePicture isOnline lastSeen" },
  { path: "readBy.user", select: "name username profilePicture" },
];

const ensureChatMember = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw httpError(404, "Chat not found.");
  }

  if (!chat.participants.some((participant) => participant.toString() === userId)) {
    throw httpError(403, "You do not have access to this chat.");
  }

  return chat;
};

const buildChatSummary = (chat, currentUserId) => {
  const lastMessage = chat.lastMessage || null;
  const unreadCount = lastMessage
    ? undefined
    : 0;

  return {
    _id: chat._id,
    isGroup: chat.isGroup,
    name: chat.name,
    description: chat.description,
    avatar: chat.avatar,
    participants: chat.participants,
    admins: chat.admins,
    owner: chat.owner,
    updatedAt: chat.updatedAt,
    createdAt: chat.createdAt,
    lastMessage,
    unreadCount,
    counterpart:
      !chat.isGroup && Array.isArray(chat.participants)
        ? chat.participants.find((participant) => participant._id.toString() !== currentUserId) || null
        : null,
  };
};

const buildMessagePayload = (message, chat) => {
  const source = typeof message.toObject === "function" ? message.toObject() : message;
  const totalRecipients = chat.participants.length - 1;
  const deliveredCount = source.deliveredTo.length;
  const senderId = source.sender?._id?.toString?.() || source.sender?.toString?.();
  const readCount = source.readBy.filter((entry) => {
    const readerId = entry.user?._id?.toString?.() || entry.user?.toString?.();
    return readerId !== senderId;
  }).length;

  return {
    ...source,
    delivery: {
      deliveredCount,
      readCount,
      totalRecipients,
      isDeliveredToAll: deliveredCount >= totalRecipients,
      isReadByAll: readCount >= totalRecipients,
    },
  };
};

const createNotification = async ({ userId, actorId, chatId, title, body, io }) => {
  const notification = await Notification.create({
    user: userId,
    actor: actorId,
    chat: chatId,
    type: "message",
    title,
    body,
  });

  io.to(`user:${userId}`).emit("notification:new", notification);
  return notification;
};

export const createDirectChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw httpError(400, "Target user is required.");
  }

  if (userId === req.user.userId) {
    throw httpError(400, "You cannot create a chat with yourself.");
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw httpError(404, "Target user not found.");
  }

  let chat = await Chat.findOne({
    isGroup: false,
    participants: { $all: [req.user.userId, userId], $size: 2 },
  }).populate(chatListPopulation);

  if (!chat) {
    chat = await Chat.create({
      isGroup: false,
      participants: [req.user.userId, userId],
    });

    chat = await Chat.findById(chat._id).populate(chatListPopulation);
  }

  res.status(201).json({
    status: "success",
    data: buildChatSummary(chat, req.user.userId),
  });
});

export const createGroupChat = asyncHandler(async (req, res) => {
  const { name, description = "", memberIds = [] } = req.body;
  const members = [...new Set([req.user.userId, ...ensureArray(memberIds).filter(Boolean)])];

  if (!name?.trim()) {
    throw httpError(400, "Group name is required.");
  }

  if (members.length < 3) {
    throw httpError(400, "A group needs at least 3 members including you.");
  }

  const foundMembers = await User.find({ _id: { $in: members } }).select("_id");
  if (foundMembers.length !== members.length) {
    throw httpError(400, "One or more selected members do not exist.");
  }

  const chat = await Chat.create({
    isGroup: true,
    name: name.trim(),
    description: description.trim(),
    participants: members,
    admins: [req.user.userId],
    owner: req.user.userId,
  });

  const populatedChat = await Chat.findById(chat._id).populate(chatListPopulation);

  req.io.to(chat._id.toString()).emit("chat:created", populatedChat);
  members.forEach((memberId) => {
    req.io.to(`user:${memberId}`).emit("chat:created", buildChatSummary(populatedChat, req.user.userId));
  });

  res.status(201).json({
    status: "success",
    data: buildChatSummary(populatedChat, req.user.userId),
  });
});

export const getChats = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);
  const skip = (page - 1) * limit;

  const filters = { participants: req.user.userId };

  const chats = await Chat.find(filters)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate(chatListPopulation)
    .lean();

  const chatIds = chats.map((chat) => chat._id);
  const unreadCounts = await Message.aggregate([
    {
      $match: {
        chat: { $in: chatIds },
        sender: { $ne: req.user.userId },
        "readBy.user": { $ne: req.user.userId },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: "$chat",
        count: { $sum: 1 },
      },
    },
  ]);

  const unreadCountMap = new Map(unreadCounts.map((entry) => [entry._id.toString(), entry.count]));

  res.json({
    status: "success",
    data: chats.map((chat) => ({
      ...buildChatSummary(chat, req.user.userId),
      unreadCount: unreadCountMap.get(chat._id.toString()) || 0,
    })),
    pagination: {
      page,
      limit,
      hasMore: chats.length === limit,
    },
  });
});

export const getMessages = asyncHandler(async (req, res) => {
  const chat = await ensureChatMember(req.params.chatId, req.user.userId);

  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 50);
  const skip = (page - 1) * limit;

  const messages = await Message.find({
    chat: chat._id,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate(messagePopulation)
    .lean();

  const orderedMessages = messages.reverse().map((message) => buildMessagePayload(message, chat));

  res.json({
    status: "success",
    data: orderedMessages,
    pagination: {
      page,
      limit,
      hasMore: messages.length === limit,
    },
  });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const chat = await ensureChatMember(req.params.chatId, req.user.userId);
  const text = req.body.text?.trim() || "";
  const files = ensureArray(req.files);

  if (!text && files.length === 0) {
    throw httpError(400, "Message text or an attachment is required.");
  }

  const attachments = [];
  for (const file of files) {
    const upload = await uploadFileToCloudinary(file, "chatblitz/messages");
    attachments.push({
      url: upload.url,
      publicId: upload.publicId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: upload.size,
      resourceType: upload.resourceType,
      width: upload.width,
      height: upload.height,
      duration: upload.duration,
    });
  }

  const onlineRecipients = chat.participants.filter(
    (participantId) =>
      participantId.toString() !== req.user.userId && req.socketUsers.has(participantId.toString()),
  );

  let message = await Message.create({
    chat: chat._id,
    sender: req.user.userId,
    text,
    attachments,
    deliveredTo: onlineRecipients,
    readBy: [{ user: req.user.userId }],
  });

  chat.lastMessage = message._id;
  await chat.save();

  message = await Message.findById(message._id).populate(messagePopulation);
  const payload = buildMessagePayload(message, chat);

  req.io.to(chat._id.toString()).emit("message:new", payload);
  req.io.emit("chat:updated", { chatId: chat._id.toString() });

  const sender = await User.findById(req.user.userId).select("name username");
  await Promise.all(
    chat.participants
      .filter((participantId) => participantId.toString() !== req.user.userId)
      .map((participantId) =>
        createNotification({
          userId: participantId.toString(),
          actorId: req.user.userId,
          chatId: chat._id,
          title: chat.isGroup ? chat.name : sender?.name || "New message",
          body: text || (attachments.length ? `Sent ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}` : "New message"),
          io: req.io,
        }),
      ),
  );

  res.status(201).json({
    status: "success",
    data: payload,
  });
});

export const editMessage = asyncHandler(async (req, res) => {
  const chat = await ensureChatMember(req.params.chatId, req.user.userId);
  const { text } = req.body;

  if (!text?.trim()) {
    throw httpError(400, "Updated message text is required.");
  }

  const message = await Message.findById(req.params.messageId).populate(messagePopulation);
  if (!message || message.chat.toString() !== chat._id.toString() || message.deletedAt) {
    throw httpError(404, "Message not found.");
  }

  if (message.sender._id.toString() !== req.user.userId) {
    throw httpError(403, "You can only edit your own messages.");
  }

  message.text = text.trim();
  message.editedAt = new Date();
  await message.save();

  const payload = buildMessagePayload(message, chat);
  req.io.to(chat._id.toString()).emit("message:updated", payload);

  res.json({
    status: "success",
    data: payload,
  });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const chat = await ensureChatMember(req.params.chatId, req.user.userId);
  const message = await Message.findById(req.params.messageId);

  if (!message || message.chat.toString() !== chat._id.toString() || message.deletedAt) {
    throw httpError(404, "Message not found.");
  }

  if (message.sender.toString() !== req.user.userId && !chat.admins.some((adminId) => adminId.toString() === req.user.userId)) {
    throw httpError(403, "You are not allowed to delete this message.");
  }

  message.deletedAt = new Date();
  await message.save();

  await Promise.all(
    message.attachments.map((attachment) => deleteCloudinaryFile(attachment.publicId, attachment.resourceType).catch(() => {})),
  );

  req.io.to(chat._id.toString()).emit("message:deleted", {
    chatId: chat._id.toString(),
    messageId: message._id.toString(),
  });

  res.json({
    status: "success",
    message: "Message deleted successfully.",
  });
});

export const markChatAsRead = asyncHandler(async (req, res) => {
  const chat = await ensureChatMember(req.params.chatId, req.user.userId);

  const unreadMessages = await Message.find({
    chat: chat._id,
    sender: { $ne: req.user.userId },
    deletedAt: null,
    "readBy.user": { $ne: req.user.userId },
  });

  if (unreadMessages.length === 0) {
    res.json({ status: "success", data: [] });
    return;
  }

  await Message.updateMany(
    {
      _id: { $in: unreadMessages.map((message) => message._id) },
    },
    {
      $push: {
        readBy: {
          user: req.user.userId,
          readAt: new Date(),
        },
      },
    },
  );

  req.io.to(chat._id.toString()).emit("chat:read", {
    chatId: chat._id.toString(),
    userId: req.user.userId,
    messageIds: unreadMessages.map((message) => message._id.toString()),
  });

  res.json({
    status: "success",
    data: unreadMessages.map((message) => message._id.toString()),
  });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const chat = await ensureChatMember(req.params.chatId, req.user.userId);

  if (!chat.isGroup) {
    throw httpError(400, "This action is only available for group chats.");
  }

  const isAdmin = chat.admins.some((adminId) => adminId.toString() === req.user.userId);
  if (!isAdmin) {
    throw httpError(403, "Only group admins can update this group.");
  }

  const { action, name, description, memberId } = req.body;

  if (action === "rename") {
    if (!name?.trim()) {
      throw httpError(400, "Group name is required.");
    }
    chat.name = name.trim();
    chat.description = typeof description === "string" ? description.trim() : chat.description;
  } else if (action === "add-member") {
    if (!memberId) {
      throw httpError(400, "Member is required.");
    }
    if (!chat.participants.some((participantId) => participantId.toString() === memberId)) {
      chat.participants.push(memberId);
    }
  } else if (action === "remove-member") {
    if (!memberId) {
      throw httpError(400, "Member is required.");
    }
    if (chat.owner?.toString() === memberId) {
      throw httpError(400, "The group owner cannot be removed.");
    }
    chat.participants = chat.participants.filter((participantId) => participantId.toString() !== memberId);
    chat.admins = chat.admins.filter((adminId) => adminId.toString() !== memberId);
  } else if (action === "toggle-admin") {
    if (!memberId) {
      throw httpError(400, "Member is required.");
    }
    const isAlreadyAdmin = chat.admins.some((adminId) => adminId.toString() === memberId);
    if (isAlreadyAdmin) {
      chat.admins = chat.admins.filter((adminId) => adminId.toString() !== memberId);
    } else {
      chat.admins.push(memberId);
    }
  } else {
    throw httpError(400, "Unsupported group action.");
  }

  await chat.save();
  const populatedChat = await Chat.findById(chat._id).populate(chatListPopulation);

  req.io.to(chat._id.toString()).emit("chat:updated", buildChatSummary(populatedChat, req.user.userId));

  res.json({
    status: "success",
    data: buildChatSummary(populatedChat, req.user.userId),
  });
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const chat = await ensureChatMember(req.params.chatId, req.user.userId);

  if (!chat.isGroup) {
    throw httpError(400, "This action is only available for group chats.");
  }

  chat.participants = chat.participants.filter((participantId) => participantId.toString() !== req.user.userId);
  chat.admins = chat.admins.filter((adminId) => adminId.toString() !== req.user.userId);

  if (chat.owner?.toString() === req.user.userId) {
    chat.owner = chat.admins[0] || chat.participants[0] || null;
    if (chat.owner && !chat.admins.some((adminId) => adminId.toString() === chat.owner.toString())) {
      chat.admins.push(chat.owner);
    }
  }

  if (chat.participants.length === 0) {
    await chat.deleteOne();
  } else {
    await chat.save();
    req.io.to(chat._id.toString()).emit("chat:updated", { chatId: chat._id.toString(), removedUserId: req.user.userId });
  }

  res.json({
    status: "success",
    message: "You left the group.",
  });
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const chat = await ensureChatMember(req.params.chatId, req.user.userId);

  if (!chat.isGroup) {
    throw httpError(400, "This action is only available for group chats.");
  }

  if (chat.owner?.toString() !== req.user.userId) {
    throw httpError(403, "Only the group owner can delete the group.");
  }

  const messages = await Message.find({ chat: chat._id });
  await Promise.all(
    messages.flatMap((message) =>
      message.attachments.map((attachment) => deleteCloudinaryFile(attachment.publicId, attachment.resourceType).catch(() => {})),
    ),
  );
  await Message.deleteMany({ chat: chat._id });
  await Notification.deleteMany({ chat: chat._id });
  await chat.deleteOne();

  req.io.to(chat._id.toString()).emit("chat:deleted", { chatId: chat._id.toString() });

  res.json({
    status: "success",
    message: "Group deleted successfully.",
  });
});

export const getChatAttachments = asyncHandler(async (req, res) => {
  const chat = await ensureChatMember(req.params.chatId, req.user.userId);

  const attachments = await Message.find({
    chat: chat._id,
    deletedAt: null,
    attachments: { $exists: true, $ne: [] },
  })
    .select("attachments sender createdAt")
    .populate("sender", "name username profilePicture")
    .sort({ createdAt: -1 })
    .lean();

  const data = attachments.flatMap((message) =>
    message.attachments.map((attachment) => ({
      ...attachment,
      sender: message.sender,
      createdAt: message.createdAt,
      messageId: message._id,
    })),
  );

  res.json({
    status: "success",
    data,
  });
});
