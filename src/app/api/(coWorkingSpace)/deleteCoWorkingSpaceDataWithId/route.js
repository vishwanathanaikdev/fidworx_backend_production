// src/app/api/deleteCoWorkingSpaceDataWithId/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import CoWorkingSpaceModel from "@/app/models/(offices)/coWorkingSpace/schema";
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

// ✅ Delete Function
async function deleteCoWorkingSpaceData({ reqApiKey, Id }) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  if (!mongoose.Types.ObjectId.isValid(Id)) {
    return { error: "Invalid Co-Working Space ID" };
  }

  await connectdb();

  const deletedData = await CoWorkingSpaceModel.findByIdAndDelete(Id);

  if (!deletedData) {
    return { error: "Co-Working Space not found" };
  }

  return { data: deletedData };
}

// ✅ DELETE API Handler
export const DELETE = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const { searchParams } = req.nextUrl;
    const Id = searchParams.get("Id");

    const { data, error } = await deleteCoWorkingSpaceData({ reqApiKey, Id });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "Co-Working Space deleted successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting Co-Working Space:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// ✅ Apply Middleware
export default corsMiddleware(async (req, res) => {
  if (req.method === "DELETE") {
    return DELETE(req, res);
  }
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
