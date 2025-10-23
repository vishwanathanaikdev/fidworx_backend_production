import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import Counter from "@/app/models/counterModel/schema";

export const dynamic = "force-dynamic";

async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Counter.findByIdAndUpdate(
        sequenceName,
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.sequence_value;
}

export async function GET(req) {
    try {
        await connectdb();
        const sequenceName = req.nextUrl.searchParams.get("sequenceName");
        if (!sequenceName) {
            return NextResponse.json({ success: false, message: "sequenceName is required." }, { status: 400 });
        }
        const sequenceValue = await getNextSequenceValue(sequenceName);
        return NextResponse.json({ success: true, sequenceValue }, { status: 200 });
    } catch (error) {
        console.error("Error getting next sequence:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}