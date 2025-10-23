// app/api/menus/route.js
import { NextResponse } from "next/server";
import connectdb from "../../../database/mongodb";
import MenusModel from "../../../models/menuDataModel/schema";
import { headers } from "next/headers";

const xkey = process.env.API_AUTH_KEY;

// POST handler - create a new menu
export const POST = async (req) => {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");
    const gXkey = req.nextUrl.searchParams.get("authkey");

    // API Key validation
    if (xkey !== reqApiKey && xkey !== gXkey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { menus } = body;

    if (!menus || !Array.isArray(menus) || menus.length === 0) {
      return NextResponse.json(
        { success: false, message: "Menus array is required" },
        { status: 400 }
      );
    }

    // Optional: validate each menu item
    for (const menuItem of menus) {
      if (!menuItem.menu) {
        return NextResponse.json(
          { success: false, message: "Each menu must have a 'menu' field" },
          { status: 400 }
        );
      }
      if (menuItem.subMenu && !Array.isArray(menuItem.subMenu)) {
        return NextResponse.json(
          { success: false, message: "'subMenu' must be an array" },
          { status: 400 }
        );
      }
    }

    // Connect to DB and create the menu document
    await connectdb();
    const newMenu = await MenusModel.create({ menus });

    return NextResponse.json(
      { success: true, message: "Menu created successfully", data: newMenu },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating menu:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// CORS support
export const OPTIONS = async () => {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale",
      "Access-Control-Allow-Credentials": "true",
    }
  });
};
