// src/app/api/notifications/mark-as-read/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import NotificationDataModel from "@/app/models/notificationDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

export async function POST(req) {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");
    const { notificationIds } = await req.json(); // Expect an array of IDs

    if (xkey !== reqApiKey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      );
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "notificationIds array is required" },
        { status: 400 }
      );
    }

    await connectdb();

    await NotificationDataModel.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { isRead: true } }
    );

    return NextResponse.json(
      { success: true, message: "Notifications marked as read" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
