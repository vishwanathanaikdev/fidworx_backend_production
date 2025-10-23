// src/app/api/(managedOffice)/coreManagedOfficeData/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

function withCors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*"); 
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

// ✅ Handle preflight requests
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// ✅ Fetch Managed Office Function
async function getManagedOffices({ reqApiKey, page, size, search }) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  await connectdb();

  const limit = size ? parseInt(size) : 10;
  const skip = page ? (parseInt(page) - 1) * limit : 0;

  let filter = {};
  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter = {
      $or: [
        { buildingName: searchRegex },
        { "location.city": searchRegex },
        { "location.address": searchRegex }
      ]
    };
  }

  const data = await ManagedOfficeModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await ManagedOfficeModel.countDocuments(filter);

  return { data, total };
}

// ✅ API GET Handler
export async function GET(req) {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");
    const page = req.nextUrl.searchParams.get("page");
    const size = req.nextUrl.searchParams.get("size");
    const search = req.nextUrl.searchParams.get("search");

    const pageNum = parseInt(page);
    const sizeNum = parseInt(size);

    if (isNaN(pageNum) || isNaN(sizeNum) || pageNum <= 0 || sizeNum <= 0) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            message: "Invalid page or size parameter. Both must be positive integers greater than zero."
          },
          { status: 400 }
        )
      );
    }

    const { data, total, error } = await getManagedOffices({
      reqApiKey,
      page,
      size,
      search
    });

    if (error) {
      return withCors(NextResponse.json({ success: false, message: error }, { status: 403 }));
    }

    return withCors(
      NextResponse.json(
        {
          success: true,
          message: "Managed office data fetched successfully",
          data,
          total
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error("Error:", error);
    return withCors(
      NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 })
    );
  }
}
