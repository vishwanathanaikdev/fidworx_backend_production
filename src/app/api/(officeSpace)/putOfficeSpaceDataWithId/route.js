import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
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

// ✅ Update OfficeSpace by ID
async function updateOfficeSpaceById(reqApiKey, Id, updateData) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  await connectdb();

  if (!Id) {
    return { error: "OfficeSpace ID is required" };
  }

  const updatedOffice = await OfficeSpaceModel.findByIdAndUpdate(
    Id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!updatedOffice) {
    return { error: "OfficeSpace not found" };
  }

  return { data: updatedOffice };
}

// ✅ PUT API Export
export const PUT = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");

    const Id = req.nextUrl.searchParams.get("Id");
    const body = await req.json();

    const { data, error } = await updateOfficeSpaceById(reqApiKey, Id, body);

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "Office space updated successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating office space:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
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
