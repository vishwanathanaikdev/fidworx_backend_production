// src/app/api/(visitUser)/verify-email-otp/route.js
import { NextResponse } from "next/server";
import connectdb from "../../../database/mongodb";
import VisitUserModel from "../../../models/visitorDataModel/schema";
import OtpModel from "../../../models/otpDataModel/schema"; // Import the new OTP model

export const dynamic = "force-dynamic";

export const POST = async (req) => {
  try {
    await connectdb();
    const { email, otp, fullName, mobile, city } = await req.json();

    if (!email || !otp) {
        return NextResponse.json({ success: false, message: "Email and OTP are required." }, { status: 400 });
    }

    // Find the OTP record from the dedicated collection
    const otpRecord = await OtpModel.findOne({ email: email.toLowerCase() });

    if (!otpRecord) {
        return NextResponse.json({ success: false, message: "OTP not found or has expired. Please request a new one." }, { status: 404 });
    }

    if (otpRecord.otp !== otp) {
      return NextResponse.json({ success: false, message: "Invalid OTP" }, { status: 400 });
    }
    
    // OTP is valid, now delete it to prevent reuse
    await OtpModel.deleteOne({ _id: otpRecord._id });

    // Now, check if the visitor exists or needs to be created
    let user = await VisitUserModel.findOne({ email: email.toLowerCase() });

    if (user) {
        // --- EXISTING USER LOGIN ---
        return NextResponse.json({ success: true, message: "Login successful!", data: user }, { status: 200 });
    } else {
        // --- NEW USER REGISTRATION ---
        if (!fullName || !mobile) {
            return NextResponse.json({ success: false, message: "fullName and mobile are required for new user registration." }, { status: 400 });
        }

        const existingMobile = await VisitUserModel.findOne({ mobile: mobile });
        if (existingMobile) {
            return NextResponse.json({ success: false, message: "This mobile number is already registered." }, { status: 409 });
        }

        const newUser = new VisitUserModel({
            email: email.toLowerCase(),
            fullName,
            mobile,
            city,
            verified: true, // Mark as verified since OTP was correct
        });
        await newUser.save();
        
        return NextResponse.json({ success: true, message: "Registration successful!", data: newUser }, { status: 201 });
    }

  } catch (err) {
    if (err.code === 11000) {
        return NextResponse.json({ success: false, message: "An account with this email or mobile number already exists." }, { status: 409 });
    }
    console.error("Error verifying OTP:", err);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};