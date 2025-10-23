import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import { headers } from "next/headers";
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

// ✅ Function to Fetch OfficeSpace by ID
async function getOfficeSpaceById(reqApiKey, Id) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  await connectdb();

  if (!Id) {
    return { error: "OfficeSpace ID is required" };
  }

  const officeSpace = await OfficeSpaceModel.findById(Id).populate("assigned_agent", "fullName name firstName lastName userId").select("-__v").lean();

  if (!officeSpace) {
    return { error: "OfficeSpace not found" };
  }

  return { data: officeSpace };
}

// ✅ GET API Export
export const GET = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");

    const Id = req.nextUrl.searchParams.get("Id");

    const { data, error } = await getOfficeSpaceById(reqApiKey, Id);

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "Office space fetched successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching office space:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
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
