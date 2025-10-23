import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import LeadDataModel from "@/app/models/leadDataModel/schema";
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

// ✅ Update Lead Status Function
async function updateLeadStatus({ reqApiKey, leadId, status, requesterId }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!leadId || !status) {
      return { error: "leadId and status are required" };
    }

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return { error: "Invalid leadId format" };
    }

    await connectdb();

    // Fetch requester profile
    const requesterProfile = await UserProfileModel.findOne({ userId: requesterId }).lean();
    if (!requesterProfile) {
      return { error: "Requester profile not found" };
    }

    // Fetch lead
    const lead = await LeadDataModel.findById(leadId);
    if (!lead) {
      return { error: "Lead not found" };
    }

    // Role-based restrictions
    if (requesterProfile.role === "handler") {
      if (lead.assignedAgentId.toString() !== requesterId.toString()) {
        return { error: "Handlers can only update their own leads" };
      }
    }
    if (requesterProfile.role === "manager") {
      const handlerProfiles = await UserProfileModel.find({ managerId: requesterId }).lean();
      const handlerIds = handlerProfiles.map(h => h.userId.toString());
      if (![requesterId.toString(), ...handlerIds].includes(lead.assignedAgentId.toString())) {
        return { error: "Managers can only update leads for their handlers or themselves" };
      }
    }
    // Admin can update any lead

    lead.status = status;
    await lead.save();

    return { data: lead };
  } catch (error) {
    console.error("Error updating lead status:", error);
    throw new Error("Database query failed");
  }
}

// ✅ API PATCH Handler
export const PATCH = async (req, res) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const leadId = req.nextUrl.searchParams.get("leadId");
    const requesterId = req.nextUrl.searchParams.get("requesterId"); // logged-in user ID

    const { status } = await req.json();

    const { data, error } = await updateLeadStatus({
      reqApiKey,
      leadId,
      status,
      requesterId
    });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "Lead status updated successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};

// ✅ CORS Middleware
const corsMiddleware = (handler) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
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

export default corsMiddleware(async (req, res) => {
  if (req.method === "PATCH") {
    return PATCH(req, res);
  }
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
