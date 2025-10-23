// src/app/api/(email)/send-email-otp-advanced/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import VisitorDataModel from "@/app/models/visitorDataModel/schema";
import OtpModel from "@/app/models/otpDataModel/schema";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

async function sendEmailWithNodemailer(params) {
    const { to_email, to_name, subject, message, otp } = params;

    let transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SMTP_HOST,
        port: process.env.EMAIL_SMTP_PORT,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_SMTP_USER,
            pass: process.env.EMAIL_SMTP_PASSWORD,
        },
    });

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: to_email,
        subject: subject,
        text: message,
        html: `<p>Your OTP is: <b>${otp}</b></p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error("Error sending email via Nodemailer:", error);
        return { success: false, error: error.message };
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

    await OtpModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { otp: otp },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const visitor = await VisitorDataModel.findOne({ email: email.toLowerCase() });
    const isNewVisitor = !visitor;

    const emailResult = await sendEmailWithNodemailer({
        to_email: email,
        to_name: visitor ? visitor.fullName : 'Valued Visitor',
        subject: "Your Verification Code",
        message: `Your OTP is: ${otp}`,
        otp: otp
    });

    if (!emailResult.success) {
        return NextResponse.json({ success: false, message: "Failed to send OTP email.", error: emailResult.error }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        message: "OTP has been sent to your email.",
        isNewVisitor
    }, { status: 200 });

  } catch (err) {
    console.error("Critical error in send-email-otp-advanced endpoint:", err);
    return NextResponse.json({
        success: false,
        message: err.message || "An internal server error occurred."
    }, { status: 500 });
  }
};