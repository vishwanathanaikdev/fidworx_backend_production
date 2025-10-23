import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserDataModel from "@/app/models/usersDataModel/schema";
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

// ✅ Fetch Users by Mobile Function
async function getUsersByMobile({ reqApiKey, page, size, mobile }) {
  try {
    if (xkey !== reqApiKey) {
      return { error: "Invalid API Auth Key" };
    }

    await connectdb();

    const limit = size ? parseInt(size) : 10;
    const skip = page ? (parseInt(page) - 1) * limit : 0;

    let filter = {};
    if (mobile) {
      const mobileRegex = new RegExp(mobile, "i"); // Partial match
      filter = { mobile: mobileRegex };
    }

    const data = await UserDataModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await UserDataModel.countDocuments(filter);

    return { data, total };
  } catch (error) {
    console.error("Error fetching user data by mobile:", error);
    throw new Error("Database query failed");
  }
}

// ✅ API GET Handler
export const GET = async (req, res) => {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");
    const page = req.nextUrl.searchParams.get("page");
    const size = req.nextUrl.searchParams.get("size");
    const mobile = req.nextUrl.searchParams.get("mobile");

    const pageNum = parseInt(page);
    const sizeNum = parseInt(size);

    if (isNaN(pageNum) || isNaN(sizeNum) || pageNum <= 0 || sizeNum <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid page or size parameter. Both must be positive integers greater than zero."
        },
        { status: 400 }
      );
    }

    const { data, total, error } = await getUsersByMobile({
      reqApiKey,
      page,
      size,
      mobile
    });

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Users fetched successfully",
        data,
        total
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// ✅ Apply Middleware
export default corsMiddleware(async (req, res) => {
  if (req.method === "GET") {
    return GET(req, res);
  }
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
