// app/models/otpDataModel/schema.js
import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true 
  },
  otp: { type: String, required: true },
  createdAt: { 
    type: Date, 
    // ✅ Use a function to get the current UTC date
    default: () => new Date(), 
    expires: '5m' // Automatically delete OTPs after 5 minutes
  }
});

const OtpModel = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
export default OtpModel;