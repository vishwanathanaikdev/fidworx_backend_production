import { NextResponse } from "next/server";
import connectdb from "@/app/database/mongodb";
import UserDataModel from "@/app/models/usersDataModel/schema";
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import roleDataModel from "@/app/models/roleDataModel/schema";
import MenusModel from "@/app/models/menuDataModel/schema";
import bcrypt from 'bcryptjs';

export const dynamic = "force-dynamic";

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
        }

        await connectdb();

        // Step 1: Find the user by their email
        const user = await UserDataModel.findOne({ email: email.toLowerCase() }).lean();
        if (!user) {
            // Use a generic error message for security
            return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
        }

        // Step 2: Compare the user-entered password with the hashed password in the database
        // const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!user.password) {
            // Passwords do not match
            return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
        }

        // --- If password is correct, proceed to fetch profile and role data ---

        // Step 3: Get user profile
        const userProfile = await UserProfileModel.findOne({ userId: user._id }).lean();
        if (!userProfile) {
            return NextResponse.json({ message: "Login failed: User profile not found." }, { status: 404 });
        }

        // Step 4: Get role data from the profile
        const roleData = await roleDataModel.findById(userProfile.roleId).lean();
        if (!roleData) {
            return NextResponse.json({ message: "Login failed: Could not determine user role." }, { status: 404 });
        }

        // Step 5: Get the menu data for that role
        const menuData = await MenusModel.findById(roleData.menuId).lean();
        if (!menuData) {
            return NextResponse.json({ message: "Login failed: Could not fetch menu data." }, { status: 404 });
        }
        
        // Step 6: Send a successful response with all the necessary data
        const responseData = {
            userId: user._id,
            email: user.email,
            menuData: menuData,
        };

        return NextResponse.json({
            success: true,
            message: "Login successful",
            data: responseData
        }, { status: 200 });

    } catch (error) {
        console.error("Login API Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}