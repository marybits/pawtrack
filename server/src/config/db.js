import mongoose from "mongoose";

/**
 * Connects to MongoDB Atlas using MONGODB_URI from the environment.
 * Exits the process on failure so a broken DB connection never goes unnoticed.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("[db] MONGODB_URI is not set. Copy server/.env.example to server/.env and fill it in.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log(`[db] Connected to MongoDB: ${mongoose.connection.name}`);
  } catch (err) {
    console.error("[db] Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB connection lost.");
  });
}
