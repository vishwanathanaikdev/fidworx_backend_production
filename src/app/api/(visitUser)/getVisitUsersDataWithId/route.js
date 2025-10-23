import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import VisitUserModel from "@/app/models/visitorDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

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

// ✅ Fetch Visitor by ID Function
async function getVisitorById({ reqApiKey, Id }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!mongoose.Types.ObjectId.isValid(Id)) {
      return { error: "Invalid Id format" };
    }

    await connectdb();

    const visitor = await VisitUserModel.findById(Id).lean();

    if (!visitor) {
      return { error: "Visitor not found" };
    }

    return { data: visitor };
  } catch (error) {
    console.error("Error fetching visitor by ID:", error);
    throw new Error("Database query failed");
  }
}

// ✅ API GET Handler
export const GET = async (req, res) => {
  try {
    const headerList = await headers(); 
    const reqApiKey = headerList.get("x-api-key");
    const Id = req.nextUrl.searchParams.get("Id");

    if (!Id) {
      return NextResponse.json(
        { success: false, message: "Id parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await getVisitorById({ reqApiKey, Id });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 404 });
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