// src/app/api/analytics/lead-summary/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import LeadDataModel from "@/app/models/leadDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

export async function GET(req) {
  try {
    const headerList =await headers();
    const reqApiKey = headerList.get("x-api-key");

    if (xkey !== reqApiKey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      );
    }

    await connectdb();

    const leadSummary = await LeadDataModel.aggregate([
      // Stage 1: Group leads by their status
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      // Stage 2: Reshape the output for total counts
      {
        $group: {
          _id: null,
          totalLeads: { $sum: "$count" },
          statusCounts: { $push: { status: "$_id", count: "$count" } },
        },
      },
      // Stage 3: Look up agent performance
      {
        $lookup: {
          from: "leads", // The collection to join
          pipeline: [
            {
              $group: {
                _id: "$assignedAgentId",
                totalLeads: { $sum: 1 },
                converted: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "converted"] }, 1, 0],
                  },
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "agentDetails",
              },
            },
            {
              $unwind: "$agentDetails",
            },
            {
              $project: {
                agentId: "$_id",
                agentName: "$agentDetails.fullName",
                totalLeads: 1,
                convertedLeads: "$converted",
                conversionRate: {
                  $cond: [
                    { $eq: ["$totalLeads", 0] },
                    0,
                    { $divide: ["$converted", "$totalLeads"] },
                  ],
                },
              },
            },
             { $sort: { totalLeads: -1 } }
          ],
          as: "agentPerformance",
        },
      },
      {
        $project: {
          _id: 0,
          totalLeads: 1,
          statusCounts: {
            $arrayToObject: {
              $map: {
                input: "$statusCounts",
                as: "status",
                in: {
                  k: "$$status.status",
                  v: "$$status.count",
                },
              },
            },
          },
          agentPerformance: 1,
        },
      },
    ]);

    const result = leadSummary.length > 0 ? leadSummary[0] : {
        totalLeads: 0,
        statusCounts: {},
        agentPerformance: []
    };

    return NextResponse.json(
      {
        success: true,
        message: "Lead summary fetched successfully",
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching lead summary:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
