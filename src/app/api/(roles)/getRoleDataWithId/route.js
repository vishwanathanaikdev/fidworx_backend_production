// app/api/roles/route.js
import { NextResponse } from "next/server";
import connectdb from "../../../database/mongodb";
import roleDataModel from "../../../models/roleDataModel/schema";
import { headers } from "next/headers";

const xkey = process.env.API_AUTH_KEY;

// GET handler with optional RoleID query param
export const GET = async (req) => {
  try {
    const headerList =await headers();
    const reqApiKey =  headerList.get("x-api-key");
    const gXkey = req.nextUrl.searchParams.get("authkey");
    const roleId = req.nextUrl.searchParams.get("RoleID");

    // API Key validation
    if (xkey !== reqApiKey && xkey !== gXkey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      );
    }

    await connectdb();

    if (roleId) {
      // Fetch by ID
      const role = await roleDataModel.findById(roleId).lean();
      if (!role) {
        return NextResponse.json(
          { success: false, message: "No role found for the given ID" },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { success: true, message: "Role fetched successfully", data: role },
        { status: 200 }
      );
    } else {
      // Fetch all if no RoleID provided
      const roles = await roleDataModel.find().lean();
      return NextResponse.json(
        { success: true, message: "Roles fetched successfully", data: roles },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error fetching roles:", error);
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
      "Access-Control-Allow-Headers": "Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale",
      "Access-Control-Allow-Credentials": "true",
    }
  });
};
