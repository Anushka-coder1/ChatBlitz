import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
      validate: {
        validator: (value) => !value || value.length >= 2,
        message: "Name must be at least 2 characters long.",
      },
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      maxlength: 30,
      validate: {
        validator: (value) => !value || /^[a-z0-9_]+$/.test(value),
        message: "Username may only contain lowercase letters, numbers, and underscores.",
      },
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    phoneSuffix: {
      type: String,
      trim: true,
      default: "",
    },
    emailOtp: {
      type: String,
      default: "",
    },
    emailOtpExpiry: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 180,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    profilePicturePublicId: {
      type: String,
      default: "",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ name: "text", username: "text", email: "text", phoneNumber: "text" });

const User = mongoose.model("User", userSchema);

export default User;
