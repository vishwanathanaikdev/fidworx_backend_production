// app/api/roles/route.js
import { NextResponse } from "next/server";
import connectdb from "../../../database/mongodb";
import roleDataModel from "../../../models/roleDataModel/schema";
import { headers } from "next/headers";

const xkey = process.env.API_AUTH_KEY;

// PUT handler - update an existing role
export const PUT = async (req) => {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");
    const gXkey = req.nextUrl.searchParams.get("authkey");

    // API Key validation
    if (xkey !== reqApiKey && xkey !== gXkey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { id, roleName, menuId, isVerified } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Role ID is required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData = {};
    if (roleName) updateData.roleName = roleName;
    if (menuId) updateData.menuId = menuId;
    if (typeof isVerified === "boolean") updateData.isVerified = isVerified;

    await connectdb();

    // Update the role
    const updatedRole = await roleDataModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedRole) {
      return NextResponse.json(
        { success: false, message: "Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Role updated successfully", data: updatedRole },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// CORS support
export const OPTIONS = async () => {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale",
      "Access-Control-Allow-Credentials": "true",
    }
  });
};
