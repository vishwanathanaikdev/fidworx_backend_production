// src/app/api/(managedOffice)/searchManageOfficeData/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

// Core business logic
async function searchManagedOffice({ reqApiKey, query }) {
  if (xkey !== reqApiKey) {
    return { error: "Invalid API Auth Key" };
  }

  await connectdb();

  const page = parseInt(query.get("page")) || 1;
  const size = parseInt(query.get("size")) || 5;
  const skip = (page - 1) * size;

  const pipeline = [];
  const filter = {};

  // 1) Keyword search
  const search = query.get("search");
  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [
      { buildingName: searchRegex },
      { "location.city": searchRegex },
      { "location.address": searchRegex },
      { "location.zone": searchRegex },
    ];
  }

  const city = query.get("city");
  if (city) {
      filter["location.city"] = new RegExp(`^${city}$`, "i");
  }


  const location = query.get("locationOfProperty");
  if (location) {
      filter["location.locationOfProperty"] = new RegExp(`^${location}$`, "i");
  }

  //furnishing level
  const furnishingLevel = query.get("furnishingLevel");
  if (furnishingLevel) {
      filter["generalInfo.furnishingLevel"] = new RegExp(`^${furnishingLevel}$`, "i");
  }

  // // 2) Location & zone
  // const location = query.get("location");
  // if (location) {
  //   filter["location.city"] = new RegExp(`^${location}$`, "i");
  // }
  const zone = query.get("zone");
  if (zone) {
    filter["location.zone"] = new RegExp(`^${zone}$`, "i");
  }

  // 3) Facility type (furnishing level)
  const buildingName = query.get("buildingName");
  if (buildingName) {
    filter["buildingName"] = new RegExp(`^${buildingName}$`, "i");
  }

  // 4) Price range
  const priceRange = query.get("priceRange");
  let minPrice = null;
  let maxPrice = null;

  if (priceRange) {
    const [rawMin, rawMax] = priceRange.split("-");
    const parsedMin = rawMin !== "" ? Number(rawMin) : null;
    const parsedMax = rawMax !== "" ? Number(rawMax) : null;

    if (parsedMin !== null && !isNaN(parsedMin)) minPrice = parsedMin;
    if (parsedMax !== null && !isNaN(parsedMax)) maxPrice = parsedMax;

    pipeline.push({
      $addFields: {
        numericRent: {
          $switch: {
            branches: [
              { case: { $eq: [{ $type: "$generalInfo.rentPerSeat" }, "double"] }, then: "$generalInfo.rentPerSeat" },
              { case: { $in: [{ $type: "$generalInfo.rentPerSeat" }, ["int", "long"]] }, then: { $toDouble: "$generalInfo.rentPerSeat" } },
              {
                case: { $eq: [{ $type: "$generalInfo.rentPerSeat" }, "string"] },
                then: {
                  $convert: {
                    to: "double",
                    onError: 0,
                    onNull: 0,
                    input: {
                      $let: {
                        vars: {
                          m: {
                            $regexFind: {
                              input: { $ifNull: ["$generalInfo.rentPerSeat", ""] },
                              regex: /[0-9]+(\.[0-9]+)?/,
                            },
                          },
                        },
                        in: {
                          $replaceAll: {
                            input: { $ifNull: ["$$m.match", "0"] },
                            find: ",",
                            replacement: "",
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
            default: 0,
          },
        },
      },
    });

    const priceMatch = {};
    if (minPrice !== null) priceMatch.$gte = minPrice;
    if (maxPrice !== null) priceMatch.$lte = maxPrice;
    if (Object.keys(priceMatch).length > 0) {
      filter.numericRent = priceMatch;
    }
  }

  // 5) Seating capacity
  const seatingCapacity = query.get("seatingCapacity");
  if (seatingCapacity) {
    const [minSeatsRaw, maxSeatsRaw] = seatingCapacity.split("-").map(Number);
    const seatMatch = {};
    if (!isNaN(minSeatsRaw)) seatMatch.$gte = minSeatsRaw;
    if (!isNaN(maxSeatsRaw)) seatMatch.$lte = maxSeatsRaw;
    if (Object.keys(seatMatch).length > 0) {
      filter["generalInfo.seaterOffered"] = seatMatch;
    }
  }

  // 6) Area Sqft filter
  const areaRange = query.get("areaSqft");
  if (areaRange) {
    const [minAreaRaw, maxAreaRaw] = areaRange.split("-").map(Number);
    const areaMatch = {};
    if (!isNaN(minAreaRaw)) areaMatch.$gte = minAreaRaw;
    if (!isNaN(maxAreaRaw)) areaMatch.$lte = maxAreaRaw;
    if (Object.keys(areaMatch).length > 0) {
      filter["location.areaSqft"] = areaMatch;
    }
  }

  // Apply filters
  if (Object.keys(filter).length > 0) {
    pipeline.push({ $match: filter });
  }

  // Pagination + count
  pipeline.push({
    $facet: {
      data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: size }],
      total: [{ $count: "count" }],
    },
  });

  const results = await ManagedOfficeModel.aggregate(pipeline);
  const data = results[0]?.data || [];
  const total = results[0]?.total?.[0]?.count || 0;

  return { data, total };
}

// GET handler
export const GET = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const queryParams = req.nextUrl.searchParams;

    const { data, total, error } = await searchManagedOffice({
      reqApiKey,
      query: queryParams,
    });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 403 });
    }

    return NextResponse.json(
      { success: true, message: "Search results fetched successfully", data, total },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in search API:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};








//======>> Pagination implementing


// // src/app/api/(managedOffice)/searchManageOfficeData/route.js
// import { NextResponse } from "next/server";
// import connectdb from "@/app/database/mongodb";
// import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
// import { headers } from "next/headers";

// export const dynamic = "force-dynamic";

// const xkey = process.env.API_AUTH_KEY;

// // Core business logic
// async function searchManagedOffice({ reqApiKey, query }) {
//   if (xkey !== reqApiKey) {
//     return { error: "Invalid API Auth Key" };
//   }

//   await connectdb();

//   const page = parseInt(query.get("page")) || 1;
//   const size = parseInt(query.get("size")) || 10;
//   const skip = (page - 1) * size;

//   const pipeline = [];
//   const filter = {};

//   // 1) Keyword search
//   const search = query.get("search");
//   if (search) {
//     const searchRegex = new RegExp(search, "i");
//     filter.$or = [
//       { buildingName: searchRegex },
//       { "location.city": searchRegex },
//       { "location.address": searchRegex },
//       { "location.zone": searchRegex },
//     ];
//   }

//   const city = query.get("city");
//   if (city) {
//       filter["location.city"] = new RegExp(`^${city}$`, "i");
//   }


//   const location = query.get("locationOfProperty");
//   if (location) {
//       filter["location.locationOfProperty"] = new RegExp(`^${location}$`, "i");
//   }

//   //furnishing level
//   const furnishingLevel = query.get("furnishingLevel");
//   if (furnishingLevel) {
//       filter["generalInfo.furnishingLevel"] = new RegExp(`^${furnishingLevel}$`, "i");
//   }

//   // // 2) Location & zone
//   // const location = query.get("location");
//   // if (location) {
//   //   filter["location.city"] = new RegExp(`^${location}$`, "i");
//   // }
//   const zone = query.get("zone");
//   if (zone) {
//     filter["location.zone"] = new RegExp(`^${zone}$`, "i");
//   }

//   // 3) Facility type (furnishing level)
//   const buildingName = query.get("buildingName");
//   if (buildingName) {
//     filter["buildingName"] = new RegExp(`^${buildingName}$`, "i");
//   }

//   // 4) Price range
//   const priceRange = query.get("priceRange");
//   let minPrice = null;
//   let maxPrice = null;

//   if (priceRange) {
//     const [rawMin, rawMax] = priceRange.split("-");
//     const parsedMin = rawMin !== "" ? Number(rawMin) : null;
//     const parsedMax = rawMax !== "" ? Number(rawMax) : null;

//     if (parsedMin !== null && !isNaN(parsedMin)) minPrice = parsedMin;
//     if (parsedMax !== null && !isNaN(parsedMax)) maxPrice = parsedMax;

//     pipeline.push({
//       $addFields: {
//         numericRent: {
//           $switch: {
//             branches: [
//               { case: { $eq: [{ $type: "$generalInfo.rentPerSeat" }, "double"] }, then: "$generalInfo.rentPerSeat" },
//               { case: { $in: [{ $type: "$generalInfo.rentPerSeat" }, ["int", "long"]] }, then: { $toDouble: "$generalInfo.rentPerSeat" } },
//               {
//                 case: { $eq: [{ $type: "$generalInfo.rentPerSeat" }, "string"] },
//                 then: {
//                   $convert: {
//                     to: "double",
//                     onError: 0,
//                     onNull: 0,
//                     input: {
//                       $let: {
//                         vars: {
//                           m: {
//                             $regexFind: {
//                               input: { $ifNull: ["$generalInfo.rentPerSeat", ""] },
//                               regex: /[0-9]+(\.[0-9]+)?/,
//                             },
//                           },
//                         },
//                         in: {
//                           $replaceAll: {
//                             input: { $ifNull: ["$$m.match", "0"] },
//                             find: ",",
//                             replacement: "",
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//               },
//             ],
//             default: 0,
//           },
//         },
//       },
//     });

//     const priceMatch = {};
//     if (minPrice !== null) priceMatch.$gte = minPrice;
//     if (maxPrice !== null) priceMatch.$lte = maxPrice;
//     if (Object.keys(priceMatch).length > 0) {
//       filter.numericRent = priceMatch;
//     }
//   }

//   // 5) Seating capacity
//   const seatingCapacity = query.get("seatingCapacity");
//   if (seatingCapacity) {
//     const [minSeatsRaw, maxSeatsRaw] = seatingCapacity.split("-").map(Number);
//     const seatMatch = {};
//     if (!isNaN(minSeatsRaw)) seatMatch.$gte = minSeatsRaw;
//     if (!isNaN(maxSeatsRaw)) seatMatch.$lte = maxSeatsRaw;
//     if (Object.keys(seatMatch).length > 0) {
//       filter["generalInfo.seaterOffered"] = seatMatch;
//     }
//   }

//   // 6) Area Sqft filter
//   const areaRange = query.get("areaSqft");
//   if (areaRange) {
//     const [minAreaRaw, maxAreaRaw] = areaRange.split("-").map(Number);
//     const areaMatch = {};
//     if (!isNaN(minAreaRaw)) areaMatch.$gte = minAreaRaw;
//     if (!isNaN(maxAreaRaw)) areaMatch.$lte = maxAreaRaw;
//     if (Object.keys(areaMatch).length > 0) {
//       filter["location.areaSqft"] = areaMatch;
//     }
//   }

//   // Apply filters
//   if (Object.keys(filter).length > 0) {
//     pipeline.push({ $match: filter });
//   }

//   // Pagination + count
//   pipeline.push({
//     $facet: {
//       data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: size }],
//       total: [{ $count: "count" }],
//     },
//   });

//   const results = await ManagedOfficeModel.aggregate(pipeline);
//   const data = results[0]?.data || [];
//   const total = results[0]?.total?.[0]?.count || 0;

//   return { data, total };
// }

// // GET handler
// export const GET = async (req) => {
//   try {
//     const headerList = await headers();
//     const reqApiKey = headerList.get("x-api-key");
//     const queryParams = req.nextUrl.searchParams;

//     const { data, total, error } = await searchManagedOffice({
//       reqApiKey,
//       query: queryParams,
//     });

//     if (error) {
//       return NextResponse.json({ success: false, message: error }, { status: 403 });
//     }

//     return NextResponse.json(
//       { success: true, message: "Search results fetched successfully", data, total },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error in search API:", error);
//     return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
//   }
// };








//=============>>> New one update with Old



// // src/app/api/(managedOffice)/searchManageOfficeData/route.js
// import { NextResponse } from "next/server";
// import connectdb from "@/app/database/mongodb";
// import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";
// import { headers } from "next/headers";

// export const dynamic = "force-dynamic";

// const xkey = process.env.API_AUTH_KEY;

// // Core business logic
// async function searchManagedOffice({ reqApiKey, query }) {
//   if (xkey !== reqApiKey) {
//     return { error: "Invalid API Auth Key" };
//   }

//   await connectdb();

//   const page = parseInt(query.get("page")) || 1;
//   const size = parseInt(query.get("size")) || 10;
//   const skip = (page - 1) * size;

//   const pipeline = [];
//   const filter = {};

//   // 1) Keyword search
//   const search = query.get("search");
//   if (search) {
//     const searchRegex = new RegExp(search, "i");
//     filter.$or = [
//       { buildingName: searchRegex },
//       { "location.city": searchRegex },
//       { "location.address": searchRegex },
//       { "location.zone": searchRegex },
//       { propertyId: searchRegex }
//     ];
//   }

//   // 2) Location & zone
//   const location = query.get("location");
//   if (location) {
//     filter["location.city"] = new RegExp(`^${location}$`, "i");
//   }
//   const zone = query.get("zone");
//   if (zone) {
//     filter["location.zone"] = new RegExp(`^${zone}$`, "i");
//   }

//   // 3) Facility type (furnishing level)
//   const facilityType = query.get("facilityType");
//   if (facilityType) {
//     filter["generalInfo.furnishingLevel"] = new RegExp(`^${facilityType}$`, "i");
//   }
  
//   // 4) Availability Status
//   const availabilityStatus = query.get("availability_status");
//   if (availabilityStatus) {
//     filter["availability_status"] = new RegExp(`^${availabilityStatus}$`, "i");
//   }

//   // 5) Price range
//   const priceRange = query.get("priceRange");
//   let minPrice = null;
//   let maxPrice = null;

//   if (priceRange) {
//     const [rawMin, rawMax] = priceRange.split("-");
//     const parsedMin = rawMin !== "" ? Number(rawMin) : null;
//     const parsedMax = rawMax !== "" ? Number(rawMax) : null;

//     if (parsedMin !== null && !isNaN(parsedMin)) minPrice = parsedMin;
//     if (parsedMax !== null && !isNaN(parsedMax)) maxPrice = parsedMax;

//     pipeline.push({
//       $addFields: {
//         numericRent: {
//           $switch: {
//             branches: [
//               { case: { $eq: [{ $type: "$generalInfo.rentPerSeat" }, "double"] }, then: "$generalInfo.rentPerSeat" },
//               { case: { $in: [{ $type: "$generalInfo.rentPerSeat" }, ["int", "long"]] }, then: { $toDouble: "$generalInfo.rentPerSeat" } },
//               {
//                 case: { $eq: [{ $type: "$generalInfo.rentPerSeat" }, "string"] },
//                 then: {
//                   $convert: {
//                     to: "double",
//                     onError: 0,
//                     onNull: 0,
//                     input: {
//                       $let: {
//                         vars: {
//                           m: {
//                             $regexFind: {
//                               input: { $ifNull: ["$generalInfo.rentPerSeat", ""] },
//                               regex: /[0-9]+(\.[0-9]+)?/,
//                             },
//                           },
//                         },
//                         in: {
//                           $replaceAll: {
//                             input: { $ifNull: ["$$m.match", "0"] },
//                             find: ",",
//                             replacement: "",
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//               },
//             ],
//             default: 0,
//           },
//         },
//       },
//     });

//     const priceMatch = {};
//     if (minPrice !== null) priceMatch.$gte = minPrice;
//     if (maxPrice !== null) priceMatch.$lte = maxPrice;
//     if (Object.keys(priceMatch).length > 0) {
//       filter.numericRent = priceMatch;
//     }
//   }

//   // 6) Seating capacity
//   const seatingCapacity = query.get("seatingCapacity");
//   if (seatingCapacity) {
//     const [minSeatsRaw, maxSeatsRaw] = seatingCapacity.split("-").map(Number);
//     const seatMatch = {};
//     if (!isNaN(minSeatsRaw)) seatMatch.$gte = minSeatsRaw;
//     if (!isNaN(maxSeatsRaw)) seatMatch.$lte = maxSeatsRaw;
//     if (Object.keys(seatMatch).length > 0) {
//       filter["generalInfo.seaterOffered"] = seatMatch;
//     }
//   }

//   // 7) Area Sqft filter
//   const areaRange = query.get("areaSqft");
//   if (areaRange) {
//     const [minAreaRaw, maxAreaRaw] = areaRange.split("-").map(Number);
//     const areaMatch = {};
//     if (!isNaN(minAreaRaw)) areaMatch.$gte = minAreaRaw;
//     if (!isNaN(maxAreaRaw)) areaMatch.$lte = maxAreaRaw;
//     if (Object.keys(areaMatch).length > 0) {
//       filter["location.areaSqft"] = areaMatch;
//     }
//   }

//   // FIXED: Apply filters before pagination
//   if (Object.keys(filter).length > 0) {
//     pipeline.push({ $match: filter });
//   }

//   // Pagination + count
//   pipeline.push({
//     $facet: {
//       data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: size }],
//       total: [{ $count: "count" }],
//     },
//   });

//   const results = await ManagedOfficeModel.aggregate(pipeline);
//   const data = results[0]?.data || [];
//   const total = results[0]?.total?.[0]?.count || 0;

//   return { data, total };
// }

// // GET handler
// export const GET = async (req) => {
//   try {
//     const headerList = await headers();
//     const reqApiKey = headerList.get("x-api-key");
//     const queryParams = req.nextUrl.searchParams;

//     const { data, total, error } = await searchManagedOffice({
//       reqApiKey,
//       query: queryParams,
//     });

//     if (error) {
//       return NextResponse.json({ success: false, message: error }, { status: 403 });
//     }

//     return NextResponse.json(
//       { success: true, message: "Search results fetched successfully", data, total },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error in search API:", error);
//     return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
//   }
// };