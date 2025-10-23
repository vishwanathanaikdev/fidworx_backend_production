// app/api/roles/route.js
import { NextResponse } from "next/server";
import connectdb from "../../../database/mongodb";
import roleDataModel from "../../../models/roleDataModel/schema";
import { headers } from "next/headers";

const xkey = process.env.API_AUTH_KEY;

// GET handler
export const GET = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const gXkey = req.nextUrl.searchParams.get("authkey");

    // API Key validation
    if (xkey !== reqApiKey && xkey !== gXkey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      );
    }

    // Connect to DB and fetch roles
    await connectdb();
    const roles = await roleDataModel.find().lean();

    if (roles.length > 0) {
      return NextResponse.json(
        { success: true, message: "Data fetched successfully", data: roles },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: "No data found", data: [] },
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
