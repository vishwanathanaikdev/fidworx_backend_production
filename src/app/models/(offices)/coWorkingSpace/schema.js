import mongoose from "mongoose";

const CoWorkingSpaceSchema = new mongoose.Schema(
  {
     propertyId: { type: String, required: true, unique: true },
    buildingName: { type: String, required: true },
    type: { type: String, enum: ["co-working"], default: "co-working" },

    generalInfo: {
      seaterOffered: { type: Number },
      deskTypes: { type: String },
      floorSize: { type: String },
      totalBuiltUpArea: { type: String },
      floors: { type: Number },
      floorsName: { type: String },
      rentPerSeat: { type: Number },
      dayPassPrice: { type: Number },
      meetingRoomHourlyRate: { type: Number },
      rentPrice: { type: String },
      maintenanceCharges: { type: String },
      powerBackup: { type: Boolean },
      ocAvailability: { type: Boolean },
      lockInPeriod: { type: String },
      furnishingLevel: { type: String, enum: ["Fully", "Semi", "Bare Shell"] },
      membershipPlans: { type: String },
      receptionHours: { type: String },
    },

    amenities: {
      parking: { type: Boolean },
      parking4Wheeler: { type: Boolean },
      parking2Wheeler: { type: Boolean },
      security: { type: Boolean },
      security24x7: { type: Boolean },
      cctv: { type: Boolean },
      pantryArea: { type: Boolean },
      cafeteria: { type: Boolean },
      coffeeTea: { type: Boolean },
      firstAidKit: { type: Boolean },
      fireExtinguisher: { type: Boolean },
      airConditioners: { type: Boolean },
      powerBackup: { type: Boolean },
      wifi: { type: Boolean },
      lift: { type: Boolean },
      gym: { type: Boolean },
      loungeArea: { type: Boolean },
      chairs: { type: String },
      washrooms: { type: String },
      meetingRooms: { type: Boolean },
      trainingRooms: { type: Boolean },
      eventSpace: { type: Boolean },
      reception: { type: Boolean },
      mailHandling: { type: Boolean },
      printingServices: { type: Boolean },
      communityEvents: { type: Boolean },
      storageLockers: { type: Boolean },
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

    // ✅ Fixed: allow up to 6 images, but full-length URLs
    // images: {
    //   type: [String],
    //   validate: {
    //     validator: (arr) => arr.length <= 6,
    //     message: "Maximum 6 images allowed",
    //   },
    // },
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

const CoWorkingSpaceModel =
  mongoose.models.CoWorkingSpace ||
  mongoose.model("CoWorkingSpace", CoWorkingSpaceSchema);

export default CoWorkingSpaceModel;
