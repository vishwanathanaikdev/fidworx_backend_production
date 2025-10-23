// src/app/api/(lead)/postLeadData/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import LeadDataModel from "@/app/models/leadDataModel/schema";
import NotificationDataModel from "@/app/models/notificationDataModel/schema";
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import RoleDataModel from "@/app/models/roleDataModel/schema";
import UserDataModel from "@/app/models/usersDataModel/schema"; // ✅ Needed for email
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import CoWorkingSpaceModel from "@/app/models/(offices)/coWorkingSpace/schema";
import VisitorDataModel from "@/app/models/visitorDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const POST = async (req) => {
  const headerList = headers();
  const reqApiKey = headerList.get("x-api-key");

  if (xkey !== reqApiKey) {
    return NextResponse.json({ success: false, message: "Invalid API Auth Key" }, { status: 401 });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectdb();
    const data = await req.json();
    const { visitorId, propertyId, message, assignedAgentId } = data;

    if (!visitorId || !propertyId || !assignedAgentId) {
      throw new Error("visitorId, propertyId, and assignedAgentId are required.");
    }

    // 1. Create the new lead
    const newLead = await LeadDataModel.create([{ ...data, status: "new" }], { session });
    const leadDoc = newLead[0];

    // --- ✅ NOTIFICATION LOGIC ---
    let property =
      (await ManagedOfficeModel.findById(propertyId).select("buildingName location").lean()) ||
      (await OfficeSpaceModel.findById(propertyId).select("buildingName location").lean()) ||
      (await CoWorkingSpaceModel.findById(propertyId).select("buildingName location").lean());

    const propertyName = property ? property.buildingName : "an unspecified property";
    const propertyLocation = property ? property.location : null;
    const visitorInfo = await VisitorDataModel.findById(visitorId).select("fullName email").lean();

    const notificationMessage = `A new lead from ${visitorInfo.fullName} (${visitorInfo.email}) has been received for property: ${propertyName}.`;
    let userIdsToNotify = [];

    // 3. Find all Admins
    const adminRole = await RoleDataModel.findOne({ roleName: "admin" }).lean();
    if (adminRole) {
      const adminProfiles = await UserProfileModel.find({ roleId: adminRole._id })
        .select("userId")
        .lean();
      userIdsToNotify.push(...adminProfiles.map((p) => p.userId));
    }

    // 4. Find Manager for the property's location
    if (propertyLocation) {
      const managerProfile = await UserProfileModel.findOne({
        role: "manager",
        managedLocation: new RegExp(propertyLocation, "i"),
      })
        .select("userId")
        .lean();

      if (managerProfile) {
        userIdsToNotify.push(managerProfile.userId);
      }
    }

    // 5. Also notify the initially assigned agent
    userIdsToNotify.push(assignedAgentId);

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIdsToNotify.map((id) => id.toString()))];

    // 6. Create in-app notifications
    const notifications = uniqueUserIds.map((userId) => ({
      userId: userId,
      message: notificationMessage,
      leadId: leadDoc._id,
    }));

    if (notifications.length > 0) {
      await NotificationDataModel.insertMany(notifications, { session });
    }

    // --- ✅ EMAIL NOTIFICATION LOGIC ---
    const usersToEmail = await UserDataModel.find({ _id: { $in: uniqueUserIds } })
      .select("fullName email")
      .lean();

    for (const user of usersToEmail) {
      if (!user?.email) continue;

      const emailParams = {
        to_email: user.email,
        to_name: user.fullName,
        subject: "New Lead Received",
        message: `Hi ${user.fullName},\n\nA new lead has been received for the property: ${propertyName}.\n\nPlease log in to the dashboard to view the details.`,
      };

      // Fire-and-forget (don't block transaction commit)
      fetch(`${baseUrl}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailParams),
      }).catch((err) => console.error("Email dispatch failed:", err.message));
    }

    // --- ✅ COMMIT ---
    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(
      { success: true, message: "Lead created and notifications + emails sent.", data: leadDoc },
      { status: 201 }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating lead:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
  }
};
    