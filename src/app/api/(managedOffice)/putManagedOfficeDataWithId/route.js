// backend/src/app/api/(managedOffice)/putManagedOfficeDataWithId/route.js

import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

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

// ✅ Update Managed Office by Id
async function updateManagedOfficeById({ reqApiKey, Id, updateData }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    if (!Id) {
      return { error: "Id is required" };
    }

    if (!mongoose.Types.ObjectId.isValid(Id)) {
      return { error: "Invalid Id format" };
    }

    await connectdb();

    const updatedOffice = await ManagedOfficeModel.findByIdAndUpdate(
      Id,
      { ...updateData, last_updated: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedOffice) {
      return { error: "No managed office found with this Id" };
    }

    return { data: updatedOffice };
  } catch (error) {
    console.error("Error updating managed office by Id:", error);
    throw new Error("Database query failed");
  }
}

// ✅ API PUT Handler
export const PUT = async (req, res) => {
  try {
    const headerList = await headers(); // ✅ Await is required
    const reqApiKey = headerList.get("x-api-key");
    const Id = req.nextUrl.searchParams.get("Id");

    const updateData = await req.json();

    const { data, error } = await updateManagedOfficeById({
      reqApiKey,
      Id,
      updateData
    });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Managed office updated successfully",
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
  if (req.method === "PUT") {
    return PUT(req, res);
  }
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
});
