// src/app/api/(coWorkingSpace)/searchCoWorkingSpaceData/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import CoWorkingSpaceModel from "@/app/models/(offices)/coWorkingSpace/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

// ✅ Business Logic
async function searchCoWorkingSpace({ reqApiKey, query }) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  await connectdb();

  const page = parseInt(query.get("page")) || 1;
  const size = parseInt(query.get("size")) || 10;
  const skip = (page - 1) * size;

  const pipeline = [];
  let filter = {};

  // 1. 🔍 Keyword search
  const search = query.get("search");
  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [
      { buildingName: searchRegex },
      { "location.city": searchRegex },
      { "location.address": searchRegex },
      { "location.zone": searchRegex },
      { propertyId: searchRegex }
    ];
  }

  // 2. 📍 Location filter
  const city = query.get("city");
  if (city) {
    filter["location.city"] = new RegExp(`^${city}$`, "i");
  }

  const zone = query.get("zone");
  if (zone) {
    filter["location.zone"] = new RegExp(`^${zone}$`, "i");
  }

  // 3. 🪑 Seating capacity filter
  const seatingCapacity = query.get("seatingCapacity");
  if (seatingCapacity) {
    const [minSeats, maxSeats] = seatingCapacity.split("-").map(Number);
    if (!isNaN(minSeats) && !isNaN(maxSeats)) {
      filter["generalInfo.seaterOffered"] = { $gte: minSeats, $lte: maxSeats };
    }
  }

  // 4. 💰 Price filter
  const priceRange = query.get("priceRange");
  if (priceRange) {
    const [min, max] = priceRange.split("-").map(Number);
    if (!isNaN(min) && !isNaN(max)) {
      filter["generalInfo.rentPerSeat"] = { $gte: min, $lte: max };
    }
  }

  // 5. 🎭 Furnishing filter
  const furnishingLevel = query.get("furnishingLevel");
  if (furnishingLevel) {
    filter["generalInfo.furnishingLevel"] = new RegExp(
      `^${furnishingLevel}$`,
      "i"
    );
  }

  // 6. 📌 Availability Status
  const availability_status = query.get("availability_status");
  if (availability_status) {
    filter["availability_status"] = new RegExp(
      `^${availability_status}$`,
      "i"
    );
  }

  // 7. ⚡ Active flag
  const is_active = query.get("is_active");
  if (is_active) {
    filter["is_active"] = is_active === "true";
  }

  // Add filter to pipeline
  if (Object.keys(filter).length > 0) {
    pipeline.push({ $match: filter });
  }

  // Facet for pagination + count
  pipeline.push({
    $facet: {
      data: [
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: size },
      ],
      total: [{ $count: "count" }],
    },
  });

  const results = await CoWorkingSpaceModel.aggregate(pipeline);

  const data = results[0]?.data || [];
  const total = results[0]?.total[0]?.count || 0;

  return { data, total };
}

// ✅ GET API Handler
export const GET = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const queryParams = req.nextUrl.searchParams;

    const { data, total, error } = await searchCoWorkingSpace({
      reqApiKey,
      query: queryParams,
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: error },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "CoWorkingSpace search results fetched successfully",
        data,
        total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in searchCoWorkingSpace API:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};
