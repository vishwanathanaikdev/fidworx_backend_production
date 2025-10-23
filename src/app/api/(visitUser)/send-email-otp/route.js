// src/app/api/(visitUser)/send-email-otp/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import VisitorDataModel from "@/app/models/visitorDataModel/schema";
import OtpModel from "@/app/models/otpDataModel/schema"; // Import the new OTP model

export const dynamic = "force-dynamic";

// (Your sendEmail helper function remains the same)
async function sendEmail(params) {
  const { to_email, to_name, subject, message } = params;

  const data = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email,
      to_name,
      subject,
      message,
    },
    accessToken: process.env.EMAILJS_PRIVATE_KEY
  };

//   Hi vikramjj,

// Your OTP is: 397989
// Thank you,
// FidCo Team

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EmailJS request failed: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email via EmailJS:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export const POST = async (req) => {
  try {
    await connectdb();
    const { email } = await req.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ success: false, message: "A valid email address is required." }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create or update the OTP in the separate OTP collection
    await OtpModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { otp: otp },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Check if the user already exists to inform the frontend
    const visitor = await VisitorDataModel.findOne({ email: email.toLowerCase() });
    const isNewVisitor = !visitor;

    await sendEmail({
        to_email: email,
        to_name: visitor ? visitor.fullName : 'Valued Visitor',
        subject: "Your Verification Code",
        message: `Your OTP is: ${otp}`
    });

    return NextResponse.json({ 
        success: true, 
        message: "OTP has been sent to your email.",
        isNewVisitor
    }, { status: 200 });

  } catch (err) {
    console.error("Critical error in send-email-otp endpoint:", err);
    return NextResponse.json({ 
        success: false, 
        message: err.message || "An internal server error occurred." 
    }, { status: 500 });
  }
};