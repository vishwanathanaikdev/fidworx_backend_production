// app/api/roles/route.js
import { NextResponse } from "next/server";
import connectdb from "../../../database/mongodb";
import roleDataModel from "../../../models/roleDataModel/schema";
import { headers } from "next/headers";

const xkey = process.env.API_AUTH_KEY;

// POST handler
export const POST = async (req) => {
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

    // Get data from request body
    const body = await req.json();
    const { roleName, menuId, isVerified } = body;

    // Validate required fields
    if (!roleName || !menuId || typeof isVerified !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    // Connect to DB and create new role
    await connectdb();
    const newRole = await roleDataModel.create({ roleName, menuId, isVerified });

    return NextResponse.json(
      { success: true, message: "Role created successfully", data: newRole },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating role:", error);
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
