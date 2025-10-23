// backend/src/app/api/(managedOffice)/postManagedOfficeData/route.js

import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import Counter from "@/app/models/counterModel/schema";
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

async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Counter.findByIdAndUpdate(
        sequenceName,
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.sequence_value;
}

// ✅ POST Handler
export const POST = async (req, res) => {
  console.log("POST REQUEST - Add Managed Office");

  const headerList = await headers(); // ✅ FIXED: headers() must be awaited
  const reqApiKey = headerList.get("x-api-key");

  // 🔹 API Key validation
  if (xkey !== reqApiKey) {
    return NextResponse.json(
      { success: false, message: "Invalid API Auth Key" },
      { status: 403 }
    );
  }

  try {
    const dataReceived = await req.json();
    console.log("Received Managed Office Data:", dataReceived);

    await connectdb();

    // ✅ Optional: Prevent duplicate building entry
    const existingOffice = await ManagedOfficeModel.findOne({
      buildingName: dataReceived.buildingName,
      "location.address": dataReceived.location?.address,
    }).exec();

    if (existingOffice) {
      return NextResponse.json(
        { success: false, message: "Managed office already exists" },
        { status: 409 }
      );
    }

    const propertyId = `P${await getNextSequenceValue("propertyId")}`;
    dataReceived.propertyId = propertyId;

    // ✅ Create new managed office record
    const newOffice = await ManagedOfficeModel.create(dataReceived);

    return NextResponse.json(
      { success: true, message: "Managed office created successfully", data: newOffice },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating managed office:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Something went wrong" },
      { status: 400 }
    );
  }
};

// ✅ Apply Middleware
export default corsMiddleware(async (req, res) => {
  if (req.method === "POST") {
    return POST(req, res);
  }
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
});