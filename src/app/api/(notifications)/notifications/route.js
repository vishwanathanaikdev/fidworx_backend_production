// src/app/api/notifications/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import NotificationDataModel from "@/app/models/notificationDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

function withCors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// ✅ FIXED: Added GET handler to fetch notifications
export async function GET(req) {
  try {
    // FIX: Added 'await' before headers()
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const userId = req.nextUrl.searchParams.get("userId");
    const page = parseInt(req.nextUrl.searchParams.get("page")) || 1;
    const size = parseInt(req.nextUrl.searchParams.get("size")) || 10;
    const skip = (page - 1) * size;


    if (xkey !== reqApiKey) {
      return withCors(NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      ));
    }

    if (!userId) {
      return withCors(NextResponse.json(
        { success: false, message: "userId is required" },
        { status: 400 }
      ));
    }

    await connectdb();

    const notifications = await NotificationDataModel.find({ userId: userId })
      .sort({ createdAt: -1 }) // Sort by most recent
      .skip(skip)
      .limit(size)
      .lean();
    
    const total = await NotificationDataModel.countDocuments({ userId: userId });

    return withCors(NextResponse.json(
      { success: true, data: notifications, total: total },
      { status: 200 }
    ));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return withCors(NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    ));
  }
}

// ... (Your POST function is already correct)
export async function POST(req) {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const { notificationIds } = await req.json(); // Expect an array of IDs

    if (xkey !== reqApiKey) {
      return withCors(NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      ));
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return withCors(NextResponse.json(
        { success: false, message: "notificationIds array is required" },
        { status: 400 }
      ));
    }

    await connectdb();

    await NotificationDataModel.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { isRead: true } }
    );

    return withCors(NextResponse.json(
      { success: true, message: "Notifications marked as read" },
      { status: 200 }
    ));
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return withCors(NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    ));
  }
}