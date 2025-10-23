// src/app/api/visitUsers/sendOtp/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import VisitUserModel from "@/app/models/visitorDataModel/schema";
import fetch from "node-fetch";

export const dynamic = "force-dynamic";

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

export const POST = async (req) => {
  try {
    await connectdb();
    const { mobile } = await req.json();

    if (!mobile) {
      return NextResponse.json({ success: false, message: "Mobile number required" }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP in DB with expiry
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await VisitUserModel.findOneAndUpdate(
      { mobile },
      { otp, otpExpiry, verified: false },
      { upsert: true, new: true }
    );

    // Send OTP via Fast2SMS
    const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": FAST2SMS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "otp",   // Quick transactional route
        message: `Your OTP is ${otp}`,
        language: "english",
        flash: 1,
        numbers: mobile
      })
    });

    const smsData = await smsRes.json();

    if (!smsRes.ok) {
      return NextResponse.json({ success: false, message: "SMS failed", details: smsData }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" }, { status: 200 });

  } catch (err) {
    console.error("Error sending OTP:", err);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};
