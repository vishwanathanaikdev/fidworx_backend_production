// src/app/api/(wishlist)/postWishlistData/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import WishlistDataModel from "@/app/models/wishlistDataModel/schema";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import CoWorkingSpaceModel from "@/app/models/(offices)/coWorkingSpace/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

export const POST = async (req) => {
  const headerList = headers();
  const reqApiKey = headerList.get("x-api-key");

  if (xkey !== reqApiKey) {
    return NextResponse.json(
      { success: false, message: "Invalid API Auth Key" },
      { status: 401 }
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectdb();
    const data = await req.json();
    const { visitorId, propertyId } = data;

    if (!visitorId || !propertyId) {
      throw new Error("visitorId and propertyId are required.");
    }

    // 1. Insert into Wishlist (prevent duplicates with upsert)
    const wishlistDoc = await WishlistDataModel.findOneAndUpdate(
      { visitorId, propertyId },
      { visitorId, propertyId },
      { new: true, upsert: true, session }
    );

    // 2. Find property details for response
    let property =
      (await ManagedOfficeModel.findById(propertyId)
        .select("buildingName location")
        .lean()) ||
      (await OfficeSpaceModel.findById(propertyId)
        .select("buildingName location")
        .lean()) ||
      (await CoWorkingSpaceModel.findById(propertyId)
        .select("buildingName location")
        .lean());

    const propertyName = property ? property.buildingName : "Unknown Property";
    const propertyLocation = property ? property.location : null;

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(
      {
        success: true,
        message: `Property '${propertyName}' added to wishlist.`,
        data: {
          wishlist: wishlistDoc,
          property: { propertyName, propertyLocation },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating wishlist:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
};
