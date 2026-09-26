import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

export async function connectDatabase() {
  const configured = process.env.MONGO_URI?.trim();

  if (configured) {
    await mongoose.connect(configured);
    console.log("Connected to MongoDB");
    return;
  }

  const memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  console.log("MONGO_URI is not set. Using an in-memory MongoDB for this session.");
}
