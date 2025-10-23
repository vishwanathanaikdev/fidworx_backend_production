// app/api/roles/getById/route.js
import { NextResponse } from 'next/server';
import connectdb from '../../../database/mongodb';
import roleDataModel from '../../../models/roleDataModel/schema';
import { headers } from 'next/headers';

const corsMiddleware = (handler) => async (req) => {
    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.headers.set("Access-Control-Allow-Headers", "Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale");
    res.headers.set("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return NextResponse.json({}, { status: 200 });
    }

    return handler(req);
};

const xkey = process.env.API_AUTH_KEY;

async function getRoleDataWithID({ reqApiKey, _id, gxkey }) {
    try {
        if (xkey !== reqApiKey && xkey !== gxkey) {
            return { success: false, message: "Invalid API Auth key" };
        }

        await connectdb();

        if (!_id) {
            return { success: false, message: "_id must be provided" };
        }

        const data = await roleDataModel.findById(_id).lean();
        if (!data) {
            return { success: false, message: "No data found for the given _id" };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching role data:', error);
        return { success: false, message: 'Database query failed' };
    }
}

export async function GET(req) {
    const headerList = headers();
    const reqApiKey = headerList.get("x-api-key");
    const gxkey = req.nextUrl.searchParams.get('authkey');
    const _id = req.nextUrl.searchParams.get('RoleID');

    try {
        const result = await getRoleDataWithID({ reqApiKey, _id, gxkey });
        if (result.success) {
            return NextResponse.json({ success: true, message: "Data fetched successfully", data: result.data }, { status: 200 });
        } else {
            return NextResponse.json({ success: false, message: result.message }, { status: 200 });
        }
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export default corsMiddleware(async (req) => {
    if (req.method === "GET") {
        return GET(req);
    }
    return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
});
