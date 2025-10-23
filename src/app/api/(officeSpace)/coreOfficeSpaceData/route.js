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

// ✅ GET OfficeSpace Data (Paginated)
async function getOfficeSpace(reqApiKey, searchParams) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  await connectdb();

  const page = parseInt(searchParams.get("page")) || 1;
  const size = parseInt(searchParams.get("size")) || 10;
  const skip = (page - 1) * size;

  const data = await OfficeSpaceModel.find({}, "-__v")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(size)
    .lean();

  const total = await OfficeSpaceModel.countDocuments();

  return { data, total, page, size };
}

// ✅ POST New OfficeSpace Record
async function addOfficeSpace(reqApiKey, body) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  await connectdb();

  const newOffice = await OfficeSpaceModel.create(body);

  return { data: newOffice };
}

// ✅ GET API Export
export const GET = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");

    const { data, total, page, size, error } = await getOfficeSpace(
      reqApiKey,
      req.nextUrl.searchParams
    );

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 403 });
    }

    return NextResponse.json(
      { success: true, message: "Office space data fetched successfully", total, page, size, data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching office space data:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};

// ✅ POST API Export
export const POST = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const body = await req.json();

    const { data, error } = await addOfficeSpace(reqApiKey, body);

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 403 });
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
  if (req.method === "GET") {
    return GET(req, res);
  }
  if (req.method === "POST") {
    return POST(req, res);
  }
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
});
