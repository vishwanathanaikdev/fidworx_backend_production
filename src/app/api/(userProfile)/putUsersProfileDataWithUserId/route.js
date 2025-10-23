import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// ✅ CORS Middleware
const corsMiddleware = (handler) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
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

// ✅ PUT Handler
export const PUT = async (req, res) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");

    // 🔹 API Key Validation
    if (xkey !== reqApiKey) {
      return NextResponse.json({ success: false, message: "Invalid API Auth Key" }, { status: 403 });
    }

    const { userId, updateData } = await req.json();

    // 🔹 Check required params
    if (!userId) {
      return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Invalid userId format" }, { status: 400 });
    }

    if (!updateData || typeof updateData !== "object") {
      return NextResponse.json({ success: false, message: "updateData is required and must be an object" }, { status: 400 });
    }

    await connectdb();

    // 🔹 Update Profile by userId
    const updatedProfile = await UserProfileModel.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedProfile) {
      return NextResponse.json({ success: false, message: "No profile found for this userId" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "User profile updated successfully", data: updatedProfile },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
};

// ✅ Apply Middleware
export default corsMiddleware(async (req, res) => {
  if (req.method === "PUT") {
    return PUT(req, res);
  }
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
