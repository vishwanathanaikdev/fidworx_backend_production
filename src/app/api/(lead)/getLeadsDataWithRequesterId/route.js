// app/api/(lead)/getLeadsDataWithRequesterId/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import LeadDataModel from "@/app/models/leadDataModel/schema";
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import roleDataModel from "@/app/models/roleDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

// ✅ Helper Function
async function getLeadsData({ reqApiKey, requesterId, page, size, status }) { // MODIFIED: Added status parameter
  if (xkey !== reqApiKey) return { error: "Invalid API Auth Key" };

  await connectdb();

  const requesterProfile = await UserProfileModel.findOne({ userId: requesterId }).lean();
  if (!requesterProfile) return { error: "Requester profile not found" };

  const roleDoc = await roleDataModel.findById(requesterProfile.roleId).lean();
  if (!roleDoc) return { error: "Role not found for requester" };

  let filter = {};

  // ✅ Role-based filtering
  if (roleDoc.roleName === "manager") {
    const handlerProfiles = await UserProfileModel.find({ managerId: requesterId }).lean();
    const handlerIds = handlerProfiles.map(h => h.userId.toString());
    filter.assignedAgentId = { $in: [requesterId.toString(), ...handlerIds] };
  } 
  else if (roleDoc.roleName === "handler") {
    filter.assignedAgentId = requesterId;
  }
  
  // ✅ ADDED: Status filter
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * size;

  const leads = await LeadDataModel.find(filter)
    .populate({
      path: "assignedAgentId",
      model: "User",
      select: "fullName email mobile profileImage"
    })
    .populate({
      path: "propertyId",
      select: "buildingName location type"
    })
    .skip(skip)
    .limit(size)
    .sort({ createdAt: -1 })
    .lean();

  const total = await LeadDataModel.countDocuments(filter);

  return { data: leads, total };
}

// ✅ API GET Handler
export const GET = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");

    const { searchParams } = req.nextUrl;
    const requesterId = searchParams.get("requesterId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "10", 10);
    const status = searchParams.get("status"); // ADDED: Get status from query

    if (!mongoose.Types.ObjectId.isValid(requesterId)) {
      return NextResponse.json({ success: false, message: "Invalid requesterId" }, { status: 400 });
    }

    const { data, total, error } = await getLeadsData({ reqApiKey, requesterId, page, size, status }); // MODIFIED: Pass status

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "Leads fetched successfully", data, total },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};