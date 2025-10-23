// app/api/(master)/searchAllProperties/route.js
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectdb from "@/app/database/mongodb";
import CoWorkingSpaceModel from "@/app/models/(offices)/coWorkingSpace/schema";
import OfficeSpaceModel from "@/app/models/(offices)/OfficeSpaceDataModel/schema";
import ManagedOfficeModel from "@/app/models/(offices)/managedOfficeDataModel/schema";

export const dynamic = "force-dynamic";

export const GET = async (req) => {
  try {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");
    const xkey = process.env.API_AUTH_KEY || process.env.APIAUTHKEY;
    if (xkey !== reqApiKey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 403 }
      );
    }

    await connectdb();

    const sp = req.nextUrl.searchParams;
    const page = parseInt(sp.get("page") ?? "1");
    const size = parseInt(sp.get("size") ?? "10");
    const skip = (page - 1) * size;

    const search = sp.get("search")?.trim();
    const city = sp.get("city")?.trim();
    const zone = sp.get("zone")?.trim();
    // Accept both availabilitystatus and availability_status from client
    const availability = (
      sp.get("availabilitystatus") || sp.get("availability_status")
    )?.trim();

    const makeMatch = () => {
      const and = [];
      if (search) {
        const r = new RegExp(search, "i");
        and.push({
          $or: [
            { buildingName: r },
            { "location.city": r },
            { "location.address": r },
            { "location.zone": r },
            { propertyId: r }
          ],
        });
      }
      if (city) and.push({ "location.city": new RegExp(city, "i") });
      if (zone) and.push({ "location.zone": new RegExp(zone, "i") });
      if (availability)
        and.push({ availability_status: new RegExp(availability, "i") });
      return and.length ? { $and: and } : {};
    };

    const match = makeMatch();

    // Common projection to unify shape
    const projectCommon = (type) => ({
      _id: 1,
      propertyId: 1,
      buildingName: 1,
      location: 1,
      availability_status: 1,
      is_active: 1, // ✅ FIX: Corrected field name from isactive to is_active
      generalInfo: 1,
      createdAt: 1,
      propertyType: { $literal: type },
    });

    // Per-collection pipelines with the same filters
    const cwPipe = [
      Object.keys(match).length ? { $match: match } : null,
      { $project: projectCommon("co-working") },
    ].filter(Boolean);

    const offPipe = [
      Object.keys(match).length ? { $match: match } : null,
      { $project: projectCommon("office") },
    ].filter(Boolean);

    const manPipe = [
      Object.keys(match).length ? { $match: match } : null,
      { $project: projectCommon("managed") },
    ].filter(Boolean);

    // Build union pipeline
    const pipeline = [
      ...cwPipe,
      {
        $unionWith: {
          coll: OfficeSpaceModel.collection.name,
          pipeline: offPipe,
        },
      },
      {
        $unionWith: {
          coll: ManagedOfficeModel.collection.name,
          pipeline: manPipe,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: size }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const results = await CoWorkingSpaceModel.aggregate(pipeline);
    const data = results?.[0]?.data ?? [];
    const total = results?.[0]?.total?.[0]?.count ?? 0;

    return NextResponse.json(
      {
        success: true,
        message: "All properties fetched",
        page,
        size,
        total,
        data,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("searchAllProperties error:", err);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};