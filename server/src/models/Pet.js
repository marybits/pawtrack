import mongoose from "mongoose";

const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Pet name is required"],
      trim: true,
    },
    species: {
      type: String,
      required: [true, "Species is required"],
      trim: true,
    },
    breed: {
      type: String,
      trim: true,
      default: null,
    },
    age: {
      type: Number,
      min: [0, "Age cannot be negative"],
      default: null,
    },
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
      default: null,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Pet", petSchema);
