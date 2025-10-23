import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import MenusModel from "@/app/models/menuDataModel/schema";
import { headers } from "next/headers";
import mongoose from "mongoose";

const xkey = process.env.API_AUTH_KEY;

// PUT handler - update an existing menu by id
export const PUT = async (req) => {
  try {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");
    const { searchParams } = req.nextUrl;

    const gXkey = searchParams.get("authkey");
    const id = searchParams.get("id"); // ✅ FIXED

    // API Key validation
    if (xkey !== reqApiKey && xkey !== gXkey) {
      return NextResponse.json(
        { success: false, message: "Invalid API Auth Key" },
        { status: 401 }
      );
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid menu document ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { menus } = body;

    if (!menus || !Array.isArray(menus) || menus.length === 0) {
      return NextResponse.json(
        { success: false, message: "Menus array is required for update" },
        { status: 400 }
      );
    }

    await connectdb();

    // Update the menu document
    const updatedMenu = await MenusModel.findByIdAndUpdate(
      id,
      { $set: { menus } },
      { new: true, runValidators: true }
    );

    if (!updatedMenu) {
      return NextResponse.json(
        { success: false, message: "Menu document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Menu updated successfully", data: updatedMenu },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating menu:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};
