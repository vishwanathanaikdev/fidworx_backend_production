// models/visitUserDataModel/schema.js
import mongoose from "mongoose";

const VisitUserSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: false 
  },
  email: { 
    type: String, 
    // ✅ The 'unique: true' option automatically creates an index.
    // We will remove the manual index creation below.
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },
  mobile: { 
    type: String, 
    required: false
  },
  city: { 
    type: String, 
    required: false 
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
}, { timestamps: true });

// Define a sparse unique index for mobile to allow multiple null values
VisitUserSchema.index({ mobile: 1 }, { unique: true, sparse: true });

// ✅ The duplicate index for email has been removed from here.

const VisitUserModel = mongoose.models.VisitUser || mongoose.model("VisitUser", VisitUserSchema);

export default VisitUserModel;