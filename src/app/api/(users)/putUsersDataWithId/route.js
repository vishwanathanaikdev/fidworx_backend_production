import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserDataModel from "@/app/models/usersDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// ✅ CORS Middleware
const corsMiddleware = (handler) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return handler(req, res);
};

const xkey = process.env.API_AUTH_KEY;

// ✅ Update User Data Function
async function updateUserById({ reqApiKey, userId, updateData }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { error: "Invalid UserId format" };
    }

    await connectdb();

    const updatedUser = await UserDataModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return { error: "User not found" };
    }

    return { data: updatedUser };
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Database query failed");
  }
}

// ✅ API PUT Handler
export const PUT = async (req, res) => {
  try {
    const headerList = await headers(); // ✅ fix to avoid Next.js warning
    const reqApiKey = headerList.get("x-api-key");

    const { userId, updateData } = await req.json();

    if (!userId || !updateData || typeof updateData !== "object") {
      return NextResponse.json(
        { success: false, message: "userId and updateData are required" },
        { status: 400 }
      );
    }

    const { data, error } = await updateUserById({
      reqApiKey,
      userId,
      updateData,
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User updated successfully",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// ✅ Apply Middleware
export default corsMiddleware(async (req, res) => {
  if (req.method === "PUT") {
    return PUT(req, res);
  }
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
});
