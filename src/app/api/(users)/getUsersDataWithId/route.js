import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserDataModel from "@/app/models/usersDataModel/schema";
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

// ✅ Fetch User by ID Function
async function getUserById({ reqApiKey, Id }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!mongoose.Types.ObjectId.isValid(Id)) {
      return { error: "Invalid Id format" };
    }

    await connectdb();

    const user = await UserDataModel.findById(Id).lean();

    if (!user) {
      return { error: "User not found" };
    }

    return { data: user };
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw new Error("Database query failed");
  }
}

// ✅ API GET Handler
export const GET = async (req, res) => {
  try {
    const headerList = await headers(); // ✅ Await for Next.js
    const reqApiKey = headerList.get("x-api-key");
    const Id = req.nextUrl.searchParams.get("Id");

    if (!Id) {
      return NextResponse.json(
        { success: false, message: "Id parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await getUserById({ reqApiKey, Id });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "User fetched successfully",
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
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
