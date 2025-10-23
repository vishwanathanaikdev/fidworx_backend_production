import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import CoWorkingSpaceModel from "@/app/models/(offices)/coWorkingSpace/schema";
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

// ✅ Create Co-Working Space Function
async function createCoWorkingSpace({ reqApiKey, body }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    await connectdb();

    const propertyId = `P${await getNextSequenceValue("propertyId")}`;
    body.propertyId = propertyId;

    const newCoWorkingSpace = await CoWorkingSpaceModel.create(body);

    return { data: newCoWorkingSpace };
  } catch (error) {
    console.error("Error creating co-working space:", error);
    throw new Error("Database insert failed");
  }
}

// ✅ API POST Handler
export const POST = async (req, res) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");

    const body = await req.json();

    const { data, error } = await createCoWorkingSpace({
      reqApiKey,
      body
    });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Co-working space created successfully",
        data
      },
      { status: 201 }
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
  if (req.method === "POST") {
    return POST(req, res);
  }
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});