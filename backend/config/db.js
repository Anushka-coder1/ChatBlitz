import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Add it to your .env file.");
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    throw new Error('MongoDB connection failed: ' , error.message);
    process.exit(1);
  }
};

export default connectDB;
