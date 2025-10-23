// src/app/api/(userProfile)/postUsersProfileData/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import roleDataModel from "@/app/models/roleDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

// ✅ Helper: Create User Profile
async function createUserProfile({ reqApiKey, dataReceived }) {
  try {
    if (xkey !== reqApiKey) return { error: "Invalid API Auth Key" };

    if (!dataReceived.userId || !mongoose.Types.ObjectId.isValid(dataReceived.userId)) {
      return { error: "Valid userId (ObjectId) is required" };
    }

    if (!dataReceived.roleId || !mongoose.Types.ObjectId.isValid(dataReceived.roleId)) {
      return { error: "Valid roleId (ObjectId) is required" };
    }

    await connectdb();

    // ✅ Fetch roleName using roleId
    const roleDoc = await roleDataModel.findById(dataReceived.roleId).lean();
    if (!roleDoc) return { error: "Invalid roleId provided" };

    // Rule: If role is handler → managerId is required
    if (roleDoc.roleName === "handler") {
      if (!dataReceived.managerId || !mongoose.Types.ObjectId.isValid(dataReceived.managerId)) {
        return { error: "A valid managerId is required for users with the 'handler' role." };
      }
    }

    const existingProfile = await UserProfileModel.findOne({ userId: dataReceived.userId });
    if (existingProfile) return { error: "Profile already exists for this user" };

    const newProfile = await UserProfileModel.create(dataReceived);
    return { data: newProfile };
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw new Error("Database insert failed");
  }
}

// ✅ API POST Handler
export const POST = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const dataReceived = await req.json();

    const { data, error } = await createUserProfile({ reqApiKey, dataReceived });

    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 });

    return NextResponse.json(
      { success: true, message: "User profile created successfully", data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
};

// ✅ Apply Middleware
const corsMiddleware = (handler) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(200).end();
  return handler(req, res);
};

export default corsMiddleware(async (req, res) => {
  if (req.method === "POST") return POST(req, res);
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
