// src/app/api/(lead)/replyToVisitor/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import NotificationDataModel from "@/app/models/notificationDataModel/schema";
import LeadDataModel from "@/app/models/leadDataModel/schema";
import UserDataModel from "@/app/models/usersDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

export const POST = async (req) => {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");

    if (xkey !== reqApiKey) {
        return NextResponse.json({ success: false, message: "Invalid API Auth Key" }, { status: 401 });
    }

    try {
        await connectdb();
        const { leadId, message, senderId } = await req.json();

        if (!leadId || !message || !senderId) {
            return NextResponse.json({ success: false, message: "leadId, message, and senderId are required." }, { status: 400 });
        }

        // 1. Find the lead to identify the visitor
        const lead = await LeadDataModel.findById(leadId).lean();
        if (!lead) {
            return NextResponse.json({ success: false, message: "Lead not found." }, { status: 404 });
        }

        // 2. Find the sender's name to include in the message
        const sender = await UserDataModel.findById(senderId).select('fullName').lean();
        if (!sender) {
            return NextResponse.json({ success: false, message: "Sender not found." }, { status: 404 });
        }

        const visitorId = lead.visitorId;
        const senderName = sender.fullName;

        // 3. Create a notification for the visitor
        const notificationMessage = `You have a new message from ${senderName}: "${message}"`;

        await NotificationDataModel.create({
            userId: visitorId, // The notification is for the VISITOR
            message: notificationMessage,
            leadId: leadId,
            // We can add a flag to distinguish this type of notification
            type: 'reply' 
        });

        return NextResponse.json({ success: true, message: "Reply sent successfully." }, { status: 201 });

    } catch (error) {
        console.error("Error replying to visitor:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
};
