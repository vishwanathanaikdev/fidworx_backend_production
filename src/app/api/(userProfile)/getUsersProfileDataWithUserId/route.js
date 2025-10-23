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

// ✅ Fetch User Profile by userId Function
async function getUserProfileByUserId({ reqApiKey, userId }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!userId) {
      return { error: "UserId is required" };
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { error: "Invalid UserId format" };
    }

    await connectdb();

    // Only returns objectId for userId
    const profile = await UserProfileModel.findOne({ userId }).lean();

    return { data: profile };
  } catch (error) {
    console.error("Error fetching user profile by userId:", error);
    throw new Error("Database query failed");
  }
}

// ✅ API GET Handler
export const GET = async (req, res) => {
  try {
    const headerList = await headers(); // ✅ FIXED
    const reqApiKey = headerList.get("x-api-key");
    const userId = req.nextUrl.searchParams.get("userId");

    const { data, error } = await getUserProfileByUserId({ reqApiKey, userId });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: "No profile found for this userId" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile fetched successfully",
        data
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
  if (req.method === "GET") {
    return GET(req, res);
  }
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
});
