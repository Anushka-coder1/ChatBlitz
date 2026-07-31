import User from "../models/user.model.js";
import Chat from "../models/chat.model.js";
import { deleteCloudinaryFile, uploadFileToCloudinary } from "../config/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { normalizeUsername } from "../utils/validators.js";

const userProjection = "name username email bio profilePicture lastSeen isOnline createdAt";

export const searchUsers = asyncHandler(async (req, res) => {
  const { search = "" } = req.query;
  const query = search.trim();

  const filters = {
    _id: { $ne: req.user.userId },
  };

  if (query) {
    filters.$or = [
      { name: { $regex: query, $options: "i" } },
      { username: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ];
  }

  const users = await User.find(filters).select(userProjection).sort({ isOnline: -1, name: 1 }).limit(20).lean();

  res.json({
    status: "success",
    data: users,
  });
});

export const getUserDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select(userProjection).lean();
  if (!user) {
    throw httpError(404, "User not found.");
  }

  const sharedChats = await Chat.countDocuments({
    participants: { $all: [req.user.userId, user._id] },
  });

  res.json({
    status: "success",
    data: {
      ...user,
      sharedChats,
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw httpError(404, "User not found.");
  }

  const { name, username, bio } = req.body;

  if (typeof name === "string" && name.trim()) {
    user.name = name.trim();
  }

  if (typeof bio === "string") {
    user.bio = bio.trim().slice(0, 180);
  }

  if (typeof username === "string" && username.trim()) {
    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername.length < 3) {
      throw httpError(400, "Username must be at least 3 characters.");
    }

    const existingUser = await User.findOne({
      username: normalizedUsername,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      throw httpError(409, "This username is already taken.");
    }

    user.username = normalizedUsername;
  }

  if (req.file) {
    if (user.profilePicturePublicId) {
      await deleteCloudinaryFile(user.profilePicturePublicId, "image").catch(() => {});
    }

    const upload = await uploadFileToCloudinary(req.file, "chatblitz/profile-pictures");
    user.profilePicture = upload.url;
    user.profilePicturePublicId = upload.publicId;
  }

  await user.save();

  res.json({
    status: "success",
    message: "Profile updated successfully.",
    data: {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePicture: user.profilePicture,
      lastSeen: user.lastSeen,
      isOnline: user.isOnline,
      createdAt: user.createdAt,
    },
  });
});
