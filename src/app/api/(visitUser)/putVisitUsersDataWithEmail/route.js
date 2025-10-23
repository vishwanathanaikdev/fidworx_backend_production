import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import VisitorDataModel from "@/app/models/visitorDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// ✅ CORS Middleware
const corsMiddleware = (handler) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
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

const xkey = process.env.API_AUTH_KEY;

// ✅ PUT Handler (Update by Email)
export const PUT = async (req, res) => {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");

    // API Key validation
    if (xkey !== reqApiKey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 403 }
      );
    }

    const email = req.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email parameter is required" },
        { status: 400 }
      );
    }

    const updateData = await req.json();

    await connectdb();

    const updatedVisitor = await VisitorDataModel.findOneAndUpdate(
      { email: email.toLowerCase() }, // Ensure lowercase match
      { $set: updateData },
      { new: true } // Return updated document
    );

    if (!updatedVisitor) {
      return NextResponse.json(
        { success: false, message: "Visitor not found with given email" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Visitor data updated successfully",
        data: updatedVisitor
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating visitor data:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// ✅ Apply Middleware
export default corsMiddleware(async (req, res) => {
  if (req.method === "PUT") {
    return PUT(req, res);
  }
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
});
