import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
const xkey = process.env.API_AUTH_KEY;

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

export const GET = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");

    if (xkey !== reqApiKey) {
      return NextResponse.json({ success: false, message: "Invalid API Auth Key" }, { status: 403 });
    }

    await connectdb();

    const page = parseInt(req.nextUrl.searchParams.get("page")) || 1;
    const size = parseInt(req.nextUrl.searchParams.get("size")) || 10;
    const skip = (page - 1) * size;

    const search = req.nextUrl.searchParams.get("search");
    const city = req.nextUrl.searchParams.get("city");
    const zone = req.nextUrl.searchParams.get("zone");
    const furnishingLevel = req.nextUrl.searchParams.get("furnishingLevel");
    const priceRange = req.nextUrl.searchParams.get("priceRange");
    const availability_status = req.nextUrl.searchParams.get("availability_status");

    let filter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { buildingName: regex },
        { "location.city": regex },
        { "location.address": regex },
        { propertyId: regex }
      ];
    }
    if (city) filter["location.city"] = new RegExp(city, "i");
    if (zone) filter["location.zone"] = new RegExp(zone, "i");
    if (furnishingLevel) filter["generalInfo.furnishingLevel"] = new RegExp(furnishingLevel, "i");
    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        filter["generalInfo.rentPerSeat"] = { $gte: min, $lte: max };
      }
    }
    if (availability_status) filter["availability_status"] = new RegExp(availability_status, "i");

    const data = await OfficeSpaceModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size)
      .lean();

    const total = await OfficeSpaceModel.countDocuments(filter);

    return NextResponse.json(
      { success: true, message: "Office space search results fetched", total, page, size, data },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error searching office space data:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};

// ✅ Apply Middleware
export default corsMiddleware(async (req, res) => {
  if (req.method === "GET") {
    return GET(req, res);
  }
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
