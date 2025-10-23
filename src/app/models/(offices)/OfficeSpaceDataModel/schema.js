import mongoose from "mongoose";

const OfficeSpaceSchema = new mongoose.Schema(
  {
     propertyId: { type: String, required: true, unique: true },
    buildingName: { type: String, required: true },
    type: { type: String, enum: ["office"], default: "office" },

    generalInfo: {
      seaterOffered: { type: Number },
      floorSize: { type: String }, // e.g., "28,000 sq. ft"
      totalBuiltUpArea: { type: String }, // e.g., "336,000 sq. ft"
      floors: { type: Number },
      floorsName: { type: String }, // e.g., "Ground, 1st, 2nd..."
      rentPerSeat: { type: Number },
      rentPrice: { type: String }, // e.g., "Rs.110/- per sq.ft"
      maintenanceCharges: { type: String }, // e.g., "Rs.7/- per sq.ft"
      powerBackup: { type: Boolean },
      ocAvailability: { type: Boolean },
      lockInPeriod: { type: String }, // e.g., "2 years"
      furnishingLevel: { type: String }, // Fully / Semi / Bare Shell
    },

    amenities: {
      parking: { type: Boolean },
      parking4Wheeler: { type: Boolean },
      parking2Wheeler: { type: Boolean },
      security: { type: Boolean },
      security24x7: { type: Boolean },
      pantryArea: { type: Boolean },
      firstAidKit: { type: Boolean },
      fireExtinguisher: { type: Boolean },
      airConditioners: { type: Boolean },
      powerBackup: { type: Boolean },
      wifi: { type: Boolean },
      lift: { type: Boolean },
      gym: { type: Boolean },
      chairs: { type: String },
      washrooms: { type: String },
      meetingRooms: { type: Boolean },
    },

    location: {
      address: { type: String },
      city: { type: String },
      zone: { type: String },
      locationOfProperty: { type: String },
      link: { type: String },
    },

    transit: {
      metroStations: [{ type: String }],
      busStations: [{ type: String }],
      trainStations: [{ type: String }],
      airports: [{ type: String }],
    },

    publicFacilities: {
      hospital: [{ type: String }],
      restaurants: [{ type: String }],
      atms: [{ type: String }],
    },

    images: {
      type: [String],
      validate: [
        {
          validator: function (arr) {
            return arr.length <= 6;
          },
          message: "Maximum 6 images allowed",
        },
        {
          validator: function (arr) {
            return arr.every((url) => /^(https?:\/\/[^\s]+)$/.test(url));
          },
          message: "All images must be valid URLs",
        },
      ],
    },

    // transactionContact: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "TransactionTeam",
    // },

    availability_status: {
      type: String,
      enum: ["Available", "Booked", "Sold Out", "Under Maintenance"],
      default: "Available",
    },
    is_active: { type: Boolean, default: true },
    availability_date: { type: Date },
    last_updated: { type: Date, default: Date.now },

    assigned_agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    additionalContacts: [
      {
        name: String,
        phone: String,
        email: String,
        role: String,
      },
    ],

    internal_notes: { type: String },
  },
  { timestamps: true }
);

function arrayLimit(val) {
  return val.length <= 6;
}

const OfficeSpaceModel =
  mongoose.models.OfficeSpace ||
  mongoose.model("OfficeSpace", OfficeSpaceSchema);

export default OfficeSpaceModel;
