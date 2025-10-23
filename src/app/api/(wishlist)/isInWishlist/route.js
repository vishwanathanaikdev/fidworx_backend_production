// src/app/api/(wishlist)/isInWishlist/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import WishlistDataModel from "@/app/models/wishlistDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

export const GET = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");

    if (xkey !== reqApiKey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      );
    }

    await connectdb();

    const visitorId = req.nextUrl.searchParams.get("visitorId");
    const propertyId = req.nextUrl.searchParams.get("propertyId");

    if (!visitorId || !propertyId) {
      return NextResponse.json(
        { success: false, message: "visitorId and propertyId are required." },
        { status: 400 }
      );
    }

    const wishlistItem = await WishlistDataModel.findOne({
      visitorId,
      propertyId,
    }).lean();

    return NextResponse.json(
      {
        success: true,
        isInWishlist: !!wishlistItem, // true if exists, false otherwise
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking wishlist:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};
