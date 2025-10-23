// backend/src/app/api/(managedOffice)/getManagedOfficeDataWithId/route.js

import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";
import UserDataModel from "@/app/models/usersDataModel/schema";

export const dynamic = "force-dynamic";

// ✅ CORS Middleware
const corsMiddleware = (handler) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, DELETE"
  );
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

// ✅ Fetch Managed Office by ID
async function getManagedOfficeById({ reqApiKey, Id }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!Id) {
      return { error: "ID is required" };
    }

    if (!mongoose.Types.ObjectId.isValid(Id)) {
      return { error: "Invalid ID format" };
    }

    await connectdb();

    const office = await ManagedOfficeModel.findById(Id).populate("assigned_agent", "fullName name firstName lastName userId").lean();

    if (!office) {
      return { error: "No managed office found with this ID" };
    }

    return { data: office };
  } catch (error) {
    console.error("Error fetching managed office by ID:", error);
    throw new Error("Database query failed");
  }
}

// ✅ API GET Handler
export const GET = async (req, res) => {
  try {
    const headerList = await headers(); // ✅ Await required
    const reqApiKey = headerList.get("x-api-key");
    const Id = req.nextUrl.searchParams.get("Id");

    const { data, error } = await getManagedOfficeById({ reqApiKey, Id });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Managed office fetched successfully",
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

// ✅ Apply Middleware
export default corsMiddleware(async (req, res) => {
  if (req.method === "GET") {
    return GET(req, res);
  }
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
});
