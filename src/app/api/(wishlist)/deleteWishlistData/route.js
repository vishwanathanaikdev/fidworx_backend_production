// src/app/api/(wishlist)/deleteWishlistData/route.js
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

export const DELETE = async (req) => {
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
    const { visitorId, propertyId } = await req.json();

    if (!visitorId || !propertyId) {
      throw new Error("visitorId and propertyId are required.");
    }

    // 1. Find and delete wishlist entry
    const deletedDoc = await WishlistDataModel.findOneAndDelete(
      { visitorId, propertyId },
      { session }
    );

    if (!deletedDoc) {
      throw new Error("Wishlist entry not found.");
    }

    // 2. Fetch property details for response
    let property =
      (await ManagedOfficeModel.findById(propertyId)
        .select("buildingName")
        .lean()) ||
      (await OfficeSpaceModel.findById(propertyId)
        .select("buildingName")
        .lean()) ||
      (await CoWorkingSpaceModel.findById(propertyId)
        .select("buildingName")
        .lean());

    const propertyName = property ? property.buildingName : "Unknown Property";

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(
      {
        success: true,
        message: `Property '${propertyName}' removed from wishlist.`,
        data: deletedDoc,
      },
      { status: 200 }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting wishlist:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
};
