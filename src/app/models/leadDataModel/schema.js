// src/app/models/leadDataModel/schema.js
import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "propertyType",
      required: true,
    },
    // propertyType: {
    //   type: String,
    //   enum: ["ManagedOffice", "OfficeSpace", "CoWorkedSpace"],
    //   required: true,
    // },
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisitUser",
      required: true,
    },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "hold", "converted", "rejected"],
      default: "new",
    },
    message: { type: String },
  },
  { timestamps: true }
);

LeadSchema.index({ assignedAgentId: 1 });

// ✅ FIX: Declare with const before exporting
const LeadDataModel =
  mongoose.models.Lead || mongoose.model("Lead", LeadSchema);

export default LeadDataModel;