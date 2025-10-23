// src/app/api/(officeSpace)/deactivateOfficeSpaceDataWithId/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const corsMiddleware = (handler) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH");
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

async function deactivateOfficeSpaceData({ reqApiKey, Id }) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  if (!mongoose.Types.ObjectId.isValid(Id)) {
    return { error: "Invalid Office Space ID" };
  }

  await connectdb();

  const deactivatedData = await OfficeSpaceModel.findByIdAndUpdate(
    Id,
    { $set: { is_active: false } },
    { new: true }
  );

  if (!deactivatedData) {
    return { error: "Office space not found" };
  }

  return { data: deactivatedData };
}

export const PATCH = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const { searchParams } = req.nextUrl;
    const Id = searchParams.get("Id");

    const { data, error } = await deactivateOfficeSpaceData({ reqApiKey, Id });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "Office space deactivated successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deactivating office space:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

export default corsMiddleware(async (req, res) => {
  if (req.method === "PATCH") {
    return PATCH(req, res);
  }
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});