import mongoose from "mongoose";

const ManagedOfficeSchema = new mongoose.Schema(
  {
     propertyId: { type: String, required: true, unique: true },
    buildingName: { type: String, required: true },
    type: { type: String, enum: ["managed"], default: "managed" },

    generalInfo: {
      seaterOffered: { type: Number },
      rentPerSeat: { type: String }, // Kept as string to handle "Rs.8500/- Per seat"
      powerAndBackup: { type: String }, // Eg: "1KVA for every 100 Sqft & 100% Backup"
      ocAvailability: { type: Boolean },
      lockInPeriod: { type: String }, // Eg: "2 years"
      furnishingLevel: { type: String }, // Eg: "Ready to move"
    },

    amenities: {
      parking: { type: String }, // "2 wheeler parking" etc.
      chairsDesks: { type: Boolean },
      washrooms: { type: String }, // Eg: "Separate Washroom"
      meetingRooms: { type: Boolean },
      security: { type: Boolean }, // Security personnel
      pantryArea: { type: Boolean },
      firstAidKit: { type: Boolean },
      fireExtinguisher: { type: Boolean },
      airConditioners: { type: Boolean },
      powerBackup: { type: Boolean },
      recreationArea: { type: Boolean },
      privateCabin: { type: Boolean },
      receptionArea: { type: Boolean },
      wifi: { type: Boolean },
    },

    location: {
      address: { type: String },
      city: { type: String },
      zone: { type: String },
      locationOfProperty: { type: String }, // Eg: "Near Prestige Feroze"
      link: { type: String },
      areaSqft: { type: Number }, // 4233 sqft
    },

    transit: {
      metroStations: [{ type: String }],
      busStations: [{ type: String }],
      trainStations: [{ type: String }],
      airports: [{ type: String }],
    },

    publicFacilities: {
      hospitals: [{ type: String }],
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

const ManagedOfficeModel =
  mongoose.models.ManagedOffice ||
  mongoose.model("ManagedOffice", ManagedOfficeSchema);

export default ManagedOfficeModel;
