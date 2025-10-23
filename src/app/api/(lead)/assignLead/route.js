// src/app/api/(lead)/assignLead/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import LeadDataModel from "@/app/models/leadDataModel/schema";
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import NotificationDataModel from "@/app/models/notificationDataModel/schema";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import CoWorkingSpaceModel from "@/app/models/(offices)/coWorkingSpace/schema";
import UserDataModel from "@/app/models/usersDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function assignLead({ reqApiKey, leadId, assignedAgentId, requesterId }) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  await connectdb();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 🔹 Permission checks
    const requesterProfile = await UserProfileModel.findOne({ userId: requesterId })
      .session(session)
      .lean();
    if (!requesterProfile) throw new Error("Requester profile not found");

        // Get requester's name
    const requester = await UserDataModel.findById(requesterId).select("fullName").session(session).lean();
    if (!requester) throw new Error("Requester not found");
    const requesterName = requester.fullName;

    if (requesterProfile.role === "handler") {
      throw new Error("You do not have permission to assign leads.");
    }

    if (requesterProfile.role === "manager") {
      const targetProfile = await UserProfileModel.findOne({ userId: assignedAgentId })
        .session(session)
        .lean();
      if (!targetProfile || String(targetProfile.managerId) !== String(requesterId)) {
        throw new Error("Managers can only assign leads to their own team members.");
      }
    }

    // 🔹 Update lead
    const updatedLead = await LeadDataModel.findByIdAndUpdate(
      leadId,
      { assignedAgentId },
      { new: true, session }
    );
    if (!updatedLead) throw new Error("Lead not found or could not be updated.");

    // 🔹 Resolve property name
    let property =
      (await ManagedOfficeModel.findById(updatedLead.propertyId).select("buildingName").lean()) ||
      (await OfficeSpaceModel.findById(updatedLead.propertyId).select("buildingName").lean()) ||
      (await CoWorkingSpaceModel.findById(updatedLead.propertyId).select("buildingName").lean());
    const propertyName = property ? property.buildingName : "an unspecified property";

    // 🔹 Create in-app notification
    await NotificationDataModel.create(
      [
        {
          userId: assignedAgentId,
          message: `You have been assigned a new lead for property: ${propertyName} by ${requesterName}.`,
          leadId: updatedLead._id,
        },
      ],
      { session }
    );

    // 🔹 Send email notification (async, don’t block response)
    const assignedUser = await UserDataModel.findById(assignedAgentId)
      .select("fullName email")
      .lean();
    if (assignedUser?.email) {
      const emailParams = {
        to_email: assignedUser.email,
        to_name: assignedUser.fullName,
        subject: "New Lead Assignment",
        message: `Hi ${assignedUser.fullName},\n\nYou have been assigned a new lead for the property: ${propertyName}.\n\nPlease log in to the dashboard to view the details.`,
      };
      fetch(`${baseUrl}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailParams),
      }).catch((err) => console.error("Email dispatch failed:", err.message));
    }

    await session.commitTransaction();
    session.endSession();

    return { data: updatedLead };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return { error: error.message };
  }
}

export const PATCH = async (req) => {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");
    const { leadId, assignedAgentId, requesterId } = await req.json();

    if (!leadId || !assignedAgentId || !requesterId) {
      return NextResponse.json(
        { success: false, message: "leadId, assignedAgentId, and requesterId are required." },
        { status: 400 }
      );
    }

    const { data, error } = await assignLead({ reqApiKey, leadId, assignedAgentId, requesterId });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "Lead assigned successfully. Notification + email sent.", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("AssignLead API Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};
