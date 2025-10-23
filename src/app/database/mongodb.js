import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

let isConnected = null; // Track connection

export default async function connectdb() {
  if (isConnected) {
    return;
  }
  const db = await mongoose.connect(MONGODB_URI);
  isConnected = db.connections[0].readyState;
}
