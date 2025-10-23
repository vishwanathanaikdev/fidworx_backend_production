// src/app/api/visitUsers/verifyOtp/route.js
import { NextResponse } from "next/server";
import connectdb from "../../../database/mongodb";
import VisitUserModel from "../../../models/visitorDataModel/schema";

export const dynamic = "force-dynamic";

export const POST = async (req) => {
  try {
    await connectdb();
    const { mobile, otp } = await req.json();

    const user = await VisitUserModel.findOne({ mobile });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (user.otp !== otp || new Date() > user.otpExpiry) {
      return NextResponse.json({ success: false, message: "Invalid or expired OTP" }, { status: 400 });
    }

    // Mark verified
    user.verified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return NextResponse.json({ success: true, message: "OTP verified successfully", data: user }, { status: 200 });

  } catch (err) {
    console.error("Error verifying OTP:", err);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};
