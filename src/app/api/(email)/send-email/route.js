// src/app/api/send-email/route.js
import { NextResponse } from "next/server";

// This is a helper function that will send the email using EmailJS's REST API.
async function sendEmail(params) {
    const { to_email, to_name, subject, message } = params;

    const data = {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY, // Your Public Key
        template_params: {
            to_email,
            to_name,
            subject,
            message,
        },
        accessToken: process.env.EMAILJS_PRIVATE_KEY // Your Private Key
    };

    try {
        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`EmailJS request failed: ${errorText}`);
        }
        return { success: true };
    } catch (error) {
        console.error("Error sending email via EmailJS:", error);
        return { success: false, error: error.message };
    }
}

// This is the API route that other parts of your backend will call.
export async function POST(req) {
    try {
        const emailParams = await req.json();
        const result = await sendEmail(emailParams);

        if (result.success) {
            return NextResponse.json({ success: true, message: "Email sent successfully." });
        } else {
            return NextResponse.json({ success: false, message: "Failed to send email.", error: result.error }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: "Internal Server Error", error: error.message }, { status: 500 });
    }
}
