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

// ✅ Update Co-Working Space Function
async function updateCoWorkingSpaceById({ reqApiKey, ID, updateData }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!mongoose.Types.ObjectId.isValid(ID)) {
      return { error: "Invalid Co-Working Space ID" };
    }

    await connectdb();

    const updatedDoc = await CoWorkingSpaceModel.findByIdAndUpdate(
      ID,
      { ...updateData, last_updated: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedDoc) {
      return { error: "Co-Working Space not found" };
    }

    return { data: updatedDoc };
  } catch (error) {
    console.error("Error updating co-working space:", error);
    throw new Error("Database update failed");
  }
}

// ✅ API PUT Handler
export const PUT = async (req, res) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const ID = req.nextUrl.searchParams.get("Id"); // ✅ Correct way to get query param

    let updateData;
    try {
      updateData = await req.json(); // Must be valid JSON
    } catch (parseError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { data, error } = await updateCoWorkingSpaceById({
      reqApiKey,
      ID,
      updateData
    });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Co-Working Space updated successfully", data },
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
  if (req.method === "PUT") {
    return PUT(req, res);
  }
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
