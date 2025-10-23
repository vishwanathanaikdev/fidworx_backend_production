
// src/app/api/(master)/getFlattenedMasterUsersData/route.js
import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import UserDataModel from "@/app/models/usersDataModel/schema";
import roleDataModel from "@/app/models/roleDataModel/schema";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const xkey = process.env.API_AUTH_KEY;

export const GET = async (req) => {
    const headerList = await headers();
    const reqApiKey = headerList.get("x-api-key");

    if (xkey !== reqApiKey) {
        return NextResponse.json({ success: false, message: "Invalid API Auth Key" }, { status: 401 });
    }

    try {
        await connectdb();

        const profiles = await UserProfileModel.find({})
            .populate({
                path: 'userId',
                model: UserDataModel,
                select: 'fullName email mobile profileImage'
            })
            .populate({ // ✅ --- THIS IS THE FIX ---
                path: 'roleId',
                model: roleDataModel,
                select: 'roleName' // Populate the roleName from the Role model
            })
            .lean();

        const flattenedData = profiles.map(p => ({
            userId: p.userId?._id,
            fullName: p.userId?.fullName,
            email: p.userId?.email,
            mobile: p.userId?.mobile,
            profileImage: p.userId?.profileImage,
            role: p.roleId?.roleName, // Use the populated roleName
            roleId: p.roleId?._id,
            managerId: p.managerId,
            profileId: p._id
        }));

        return NextResponse.json({ success: true, data: flattenedData }, { status: 200 });

    } catch (error) {
        console.error("Error fetching flattened user data:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
};
