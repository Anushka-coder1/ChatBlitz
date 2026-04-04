import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,//check uniquness only when value is entered
    },
    phoneSuffix: {
      type: String,
      unique: false,
    },
    email: {
      type: String,
      lowercase: true,
      match: [/.+\@.+\..+/, 'Email format is invalid.'],
      unique: true,
      sparse: true,//check uniquness only when value is entered
    },
    emailOtp: {
      type: String,
    },
    emailOtpExpiry: {
      type: Date,
    },
    profilePicture: {
      type: String,
      default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
    },
    about: {
      type: String,
    },
    lastSeen: {
      type: Date
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    agreed : {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true
  }
)

const User = mongoose.model("User", userSchema)

export default User;
