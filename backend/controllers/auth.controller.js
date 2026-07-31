import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { signToken } from "../utils/jwt.js";
import { isEmail, normalizeUsername } from "../utils/validators.js";
import otpGenerator from "../utils/otpGenerator.js";
import sendOtpEmail from "../services/email.service.js";
import { sendOtpToPhoneNumber, verifyOtp as verifyPhoneOtp } from "../services/twilio.service.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: String(process.env.NODE_ENV).toLowerCase() === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  phoneNumber: user.phoneNumber,
  phoneSuffix: user.phoneSuffix,
  bio: user.bio,
  profilePicture: user.profilePicture,
  lastSeen: user.lastSeen,
  isOnline: user.isOnline,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

const buildDefaultIdentity = (email, phoneNumber) => {
  if (email) {
    const emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    return emailPrefix || "ChatBlitz User";
  }

  if (phoneNumber) {
    return `User ${phoneNumber.slice(-4)}`;
  }

  return "ChatBlitz User";
};

const generateAvailableUsername = async (seedValue) => {
  const base = normalizeUsername(seedValue) || `user${Math.floor(1000 + Math.random() * 9000)}`;

  let candidate = base.slice(0, 24);
  let suffix = 0;

  while (await User.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${base.slice(0, 20)}${suffix}`;
  }

  return candidate;
};

const ensureUserIdentity = async (user) => {
  if (!user.name?.trim()) {
    user.name = buildDefaultIdentity(user.email, user.phoneNumber);
  }

  const hasValidUsername = user.username?.trim() && /^[a-z0-9_]+$/.test(user.username);

  if (!hasValidUsername) {
    user.username = await generateAvailableUsername(user.name || user.email || user.phoneNumber);
  }

  return user;
};

export const sendOtp = asyncHandler(async (req, res) => {
  const { email = "", phoneNumber = "", phoneSuffix = "" } = req.body;
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhoneNumber = phoneNumber.trim();
  const trimmedPhoneSuffix = phoneSuffix.trim();

  if (!trimmedEmail && !trimmedPhoneNumber) {
    throw httpError(400, "Provide either an email address or a phone number.");
  }

  if (trimmedEmail) {
    if (!isEmail(trimmedEmail)) {
      throw httpError(400, "Please provide a valid email address.");
    }

    const otp = otpGenerator();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    let user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      user = new User({
        email: trimmedEmail,
        name: buildDefaultIdentity(trimmedEmail, ""),
      });
    }

    await ensureUserIdentity(user);
    user.emailOtp = otp;
    user.emailOtpExpiry = expiry;
    await user.save();
    await sendOtpEmail(trimmedEmail, otp);

    res.json({
      status: "success",
      message: "OTP sent to your email address.",
      data: {
        email: trimmedEmail,
        channel: "email",
      },
    });
    return;
  }

  if (!trimmedPhoneSuffix) {
    throw httpError(400, "Country code is required for phone authentication.");
  }

  const fullPhoneNumber = `${trimmedPhoneSuffix}${trimmedPhoneNumber}`;

  let user = await User.findOne({ phoneNumber: trimmedPhoneNumber });
  if (!user) {
    user = new User({
      phoneNumber: trimmedPhoneNumber,
      phoneSuffix: trimmedPhoneSuffix,
      name: buildDefaultIdentity("", trimmedPhoneNumber),
    });
  }

  await ensureUserIdentity(user);
  await user.save();
  await sendOtpToPhoneNumber(fullPhoneNumber);

  res.json({
    status: "success",
    message: "OTP sent to your phone number.",
    data: {
      phoneNumber: trimmedPhoneNumber,
      phoneSuffix: trimmedPhoneSuffix,
      channel: "phone",
    },
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email = "", phoneNumber = "", phoneSuffix = "", otp = "" } = req.body;
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhoneNumber = phoneNumber.trim();
  const trimmedPhoneSuffix = phoneSuffix.trim();
  const trimmedOtp = otp.trim();

  if (!trimmedOtp) {
    throw httpError(400, "OTP is required.");
  }

  let user;

  if (trimmedEmail) {
    user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      throw httpError(404, "User not found for this email.");
    }

    const now = new Date();
    if (!user.emailOtp || String(user.emailOtp) !== trimmedOtp || now > new Date(user.emailOtpExpiry)) {
      throw httpError(400, "Invalid or expired OTP.");
    }

    user.emailOtp = "";
    user.emailOtpExpiry = null;
  } else {
    if (!trimmedPhoneNumber || !trimmedPhoneSuffix) {
      throw httpError(400, "Phone number and country code are required.");
    }

    user = await User.findOne({ phoneNumber: trimmedPhoneNumber });
    if (!user) {
      throw httpError(404, "User not found for this phone number.");
    }

    const verification = await verifyPhoneOtp(`${trimmedPhoneSuffix}${trimmedPhoneNumber}`, trimmedOtp);
    if (verification.status !== "approved") {
      throw httpError(400, "Invalid OTP.");
    }
  }

  await ensureUserIdentity(user);
  user.isVerified = true;
  await user.save();

  const token = signToken({ userId: user._id.toString() });
  res.cookie("auth_token", token, cookieOptions);

  res.json({
    status: "success",
    message: "OTP verified successfully.",
    data: {
      token,
      user: sanitizeUser(user),
    },
  });
});

export const completeProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw httpError(404, "User not found.");
  }

  const { name = "", username = "", bio = "" } = req.body;
  if (name.trim()) {
    user.name = name.trim();
  }

  if (username.trim()) {
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

  user.bio = bio.trim();
  await user.save();

  res.json({
    status: "success",
    message: "Profile completed successfully.",
    data: {
      user: sanitizeUser(user),
    },
  });
});

export const logout = asyncHandler(async (_req, res) => {
  res.cookie("auth_token", "", {
    ...cookieOptions,
    maxAge: 0,
  });

  res.json({
    status: "success",
    message: "Logged out successfully.",
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).lean();
  if (!user) {
    throw httpError(404, "User not found.");
  }

  res.json({
    status: "success",
    data: sanitizeUser(user),
  });
});
