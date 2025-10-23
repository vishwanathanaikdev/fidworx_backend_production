// models/wishlistDataModel/schema.js
import mongoose from "mongoose";
import VisitUserModel from "../visitorDataModel/schema";


const WishlistSchema = new mongoose.Schema(
  {
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisitUser",
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // propertyType: {
    //   type: String,
    //   enum: ["ManagedOffice", "OfficeSpace", "CoWorkedSpace"],
    //   required: true,
    // },
  },
  { timestamps: true }
);

WishlistSchema.index(
  { visitorId: 1, propertyId: 1 },
  { unique: true }
);

let WishlistDataModel =
  mongoose.models.Wishlist || mongoose.model("Wishlist", WishlistSchema);

export default WishlistDataModel;