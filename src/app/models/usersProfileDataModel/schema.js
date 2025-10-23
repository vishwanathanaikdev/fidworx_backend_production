import mongoose from "mongoose";
// import UserDataModel from "../usersDataModel/schema";
import "@/app/models/usersDataModel/schema";

const UserProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    pastCompany: {
      name: { type: String },
      logo: { type: String }, // Store logo URL or file path
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    completedLeadsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const UserProfileModel =
  mongoose.models.UserProfile ||
  mongoose.model("UserProfile", UserProfileSchema);

export default UserProfileModel;
