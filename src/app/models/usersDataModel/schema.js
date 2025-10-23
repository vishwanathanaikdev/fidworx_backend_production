import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 3,
    },
    
    mobile: {
      type: String,
      required: true,
      // match: /^[6-9]\d{9}$/, // Indian mobile number pattern
    },

    profileImage: {
      type: String,
      required: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isTerminated: {
      type: Boolean,
      default: false,
    },

  },
  {
    timestamps: true,
  }
);

const UserDataModel = mongoose.models.User || mongoose.model("User", UserSchema);

export default UserDataModel;
