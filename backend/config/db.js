import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Add it to your environment configuration.");
  }

  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });

  console.log("MongoDB connected");
};

export default connectDB;
