// src/middleware/checkPermission.js
import UserProfileModel from "@/app/models/usersProfileDataModel/schema";
import RoleDataModel from "@/app/models/roleDataModel/schema";
import mongoose from "mongoose";

export async function checkPermission(userId, requiredPermission) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  // 1️⃣ Get user profile
  const profile = await UserProfileModel.findOne({ userId }).lean();
  if (!profile) {
    throw new Error("User profile not found");
  }

  // 2️⃣ Get role permissions
  const roleData = await RoleDataModel.findOne({ roleName: profile.role }).lean();
  if (!roleData) {
    throw new Error("Role not found in RoleDataModel");
  }

  // 3️⃣ Check permission
  if (requiredPermission && !roleData.permissions[requiredPermission]) {
    return { allowed: false, role: profile.role, menus: roleData.main_menu, subMenus: roleData.sub_menu };
  }

  return {
    allowed: true,
    role: profile.role,
    menus: roleData.main_menu,
    subMenus: roleData.sub_menu,
    permissions: roleData.permissions
  };
}
