import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserDataModel from "@/app/models/usersDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

export async function GET(req) {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");

    // 1. Authorization Check: Is the API key valid?
    if (!reqApiKey || reqApiKey !== xkey) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid API Key" },
        { status: 401 }
      );
    }

    const email = req.nextUrl.searchParams.get("email");

    // 2. Validation Check: Is the email parameter present?
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Bad Request: Email parameter is required" },
        { status: 400 }
      );
    }

    await connectdb();

    // 3. Database Query
    const user = await UserDataModel.findOne({ email: email.toLowerCase() }).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "No user found with this email" },
        { status: 404 }
      );
    }

    return NextResponse.json({
        success: true,
        message: "User fetched successfully",
        data: user,
      }, { status: 200 });

  } catch (error) {
    console.error("Error in getUsersDataWithEmail:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}