import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserDataModel from "@/app/models/usersDataModel/schema";
import { headers } from "next/headers";
import NotificationDataModel from "@/app/models/notificationDataModel/schema";
export const dynamic = "force-dynamic";

// ✅ CORS Middleware
const corsMiddleware = (handler) => (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin,Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,locale"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return handler(req, res);
};


 
const xkey = process.env.API_AUTH_KEY;

// ✅ POST Handler
export const POST = async (req, res) => {
  console.log("POST REQUEST - Add User");

  const headerList = headers();
  const reqApiKey = headerList.get("x-api-key");

  // API Key validation
  if (xkey !== reqApiKey) {
    return NextResponse.json({ success: false, message: "Invalid API Auth Key" }, { status: 403 });
  }

  try {
    const dataReceived = await req.json();
    console.log("Received User Data:", dataReceived);

    await connectdb();

    // Check for existing user by email or mobile
    const existingUser = await UserDataModel.findOne({
      $or: [{ email: dataReceived.email }, { mobile: dataReceived.mobile }]
    }).exec();

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User already exists in database" },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = await UserDataModel.create(dataReceived);

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Something went wrong" },
      { status: 400 }
    );
  }
};

// ✅ Apply Middleware
export default corsMiddleware(async (req, res) => {
  if (req.method === "POST") {
    return POST(req, res);
  }
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
