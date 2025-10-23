// app/api/menus/route.js
import { NextResponse } from "next/server";
import connectdb from "../../../database/mongodb";
import MenusModel from "../../../models/menuDataModel/schema";
import { headers } from "next/headers";

const xkey = process.env.API_AUTH_KEY;

// GET handler - fetch all menus
export const GET = async (req) => {
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

    // Connect to DB and fetch menus
    await connectdb();
    const menus = await MenusModel.find().lean();

    if (menus.length > 0) {
      return NextResponse.json(
        { success: true, message: "Menus fetched successfully", data: menus },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: "No menus found", data: [] },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error fetching menus:", error);
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale",
      "Access-Control-Allow-Credentials": "true",
    }
  });
};
