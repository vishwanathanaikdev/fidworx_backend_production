import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import VisitorDataModel from "@/app/models/visitorDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// ✅ CORS Middleware
const corsMiddleware = (handler) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
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

const xkey = process.env.API_AUTH_KEY;

// ✅ Fetch Visitors by Mobile Function
async function getVisitorByMobile({ reqApiKey, mobile }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!mobile) {
      return { error: "Mobile number is required" };
    }

    await connectdb();

    // Exact match
    const visitor = await VisitorDataModel.findOne({ mobile }).lean();

    return { data: visitor };
  } catch (error) {
    console.error("Error fetching visitor by mobile:", error);
    throw new Error("Database query failed");
  }
}

// ✅ API GET Handler
export const GET = async (req, res) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const mobile = req.nextUrl.searchParams.get("mobile");

    const { data, error } = await getVisitorByMobile({
      reqApiKey,
      mobile
    });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: "No visitor found with this mobile number" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Visitor fetched successfully",
        data
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