import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

async function updateUserRoleById({ reqApiKey, userId, roleId }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(roleId)) {
      return { error: "Invalid userId or roleId format" };
    }

    await connectdb();

    const updatedProfile = await UserProfileModel.findOneAndUpdate(
      { userId },
      { $set: { roleId } },
      { new: true }
    ).lean();

    if (!updatedProfile) {
      return { error: "User profile not found" };
    }

    return { data: updatedProfile };
  } catch (error) {
    console.error("Error updating user role:", error);
    throw new Error("Database query failed");
  }
}

export const PUT = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const { userId, roleId } = await req.json();

    if (!userId || !roleId) {
      return NextResponse.json(
        { success: false, message: "userId and roleId are required" },
        { status: 400 }
      );
    }

    const { data, error } = await updateUserRoleById({
      reqApiKey,
      userId,
      roleId,
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User role updated successfully",
        data,
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