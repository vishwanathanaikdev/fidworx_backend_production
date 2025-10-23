// src/app/api/(wishlist)/getWishlistData/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import WishlistDataModel from "@/app/models/wishlistDataModel/schema";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import CoWorkingSpaceModel from "@/app/models/(offices)/coWorkingSpace/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

export const GET = async (req) => {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");

    if (xkey !== reqApiKey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      );
    }

    await connectdb();

    // Extract visitorId from query params
    const visitorId = req.nextUrl.searchParams.get("visitorId");
    if (!visitorId) {
      return NextResponse.json(
        { success: false, message: "visitorId is required." },
        { status: 400 }
      );
    }

    // 1. Get wishlist items
    const wishlistItems = await WishlistDataModel.find({ visitorId }).lean();

    if (wishlistItems.length === 0) {
      return NextResponse.json(
        { success: true, message: "No wishlist items found.", data: [] },
        { status: 200 }
      );
    }

    // 2. Fetch property details for each wishlist item
    const populatedWishlist = await Promise.all(
      wishlistItems.map(async (item) => {
        let property =
          (await ManagedOfficeModel.findById(item.propertyId)
            .select("buildingName location images type")
            .lean()) ||
          (await OfficeSpaceModel.findById(item.propertyId)
            .select("buildingName location images type")
            .lean()) ||
          (await CoWorkingSpaceModel.findById(item.propertyId)
            .select("buildingName location images type")
            .lean());

        return {
          ...item,
          property: property || { buildingName: "Unknown", location: null, images: null, type: null },
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: "Wishlist items fetched successfully.",
        data: populatedWishlist,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching wishlist data:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
};








//===============>>> new one updated with new one




// // src/app/api/(wishlist)/getWishlistData/route.js
// import { NextResponse } from "next/server";
// import connectdb from "@/app/database/mongodb";
// import WishlistDataModel from "@/app/models/wishlistDataModel/schema";
// import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
// import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
// import CoWorkingSpaceModel from "@/app/models/(offices)/coWorkingSpace/schema";
// import { headers } from "next/headers";

// export const dynamic = "force-dynamic";

// const xkey = process.env.API_AUTH_KEY;

// export const GET = async (req) => {
//   try {
//     const headerList = headers();
//     const reqApiKey = headerList.get("x-api-key");

//     if (xkey !== reqApiKey) {
//       return NextResponse.json(
//         { success: false, message: "Invalid API Auth Key" },
//         { status: 401 }
//       );
//     }

//     await connectdb();

//     // Extract visitorId from query params
//     const visitorId = req.nextUrl.searchParams.get("visitorId");
//     if (!visitorId) {
//       return NextResponse.json(
//         { success: false, message: "visitorId is required." },
//         { status: 400 }
//       );
//     }

//     // 1. Get wishlist items
//     const wishlistItems = await WishlistDataModel.find({ visitorId }).lean();

//     if (wishlistItems.length === 0) {
//       return NextResponse.json(
//         { success: true, message: "No wishlist items found.", data: [] },
//         { status: 200 }
//       );
//     }

//     // 2. Fetch property details for each wishlist item
//     const populatedWishlist = await Promise.all(
//       wishlistItems.map(async (item) => {
//         let property =
//           (await ManagedOfficeModel.findById(item.propertyId)
//             .select("buildingName location")
//             .lean()) ||
//           (await OfficeSpaceModel.findById(item.propertyId)
//             .select("buildingName location")
//             .lean()) ||
//           (await CoWorkingSpaceModel.findById(item.propertyId)
//             .select("buildingName location")
//             .lean());

//         return {
//           ...item,
//           property: property || { buildingName: "Unknown", location: null },
//         };
//       })
//     );

//     return NextResponse.json(
//       {
//         success: true,
//         message: "Wishlist items fetched successfully.",
//         data: populatedWishlist,
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error fetching wishlist data:", error);
//     return NextResponse.json(
//       { success: false, message: error.message || "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// };
    