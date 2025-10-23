import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import Counter from "@/app/models/counterModel/schema";
import { headers } from "next/headers";

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

async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Counter.findByIdAndUpdate(
        sequenceName,
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.sequence_value;
}


// ✅ Function to Create OfficeSpace
async function addOfficeSpace(reqApiKey, body) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  await connectdb();

  if (!body.buildingName) {
    return { error: "buildingName is required" };
  }

  const propertyId = `P${await getNextSequenceValue("propertyId")}`;
  body.propertyId = propertyId;

  const newOffice = await OfficeSpaceModel.create(body);

  return { data: newOffice };
}

// ✅ POST API Export
export const POST = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const body = await req.json();

    const { data, error } = await addOfficeSpace(reqApiKey, body);

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "Office space created successfully", data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating office space:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
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