import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
      index: true,
    },
    medicationName: {
      type: String,
      required: [true, "Medication name is required"],
      trim: true,
    },
    // How often the dose should be given, expressed in hours.
    // 12 = twice daily, 24 = once daily, 48 = every 2 days, etc.
    intervalHours: {
      type: Number,
      required: [true, "Interval is required"],
      min: [1, "Interval must be at least 1 hour"],
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Optional dose info — pre-fills the logging form when the owner selects this med.
    dose: {
      type: Number,
      default: null,
    },
    doseUnit: {
      type: String,
      trim: true,
      default: null,
    },

    // null = ongoing (no scheduled end)
    endDate: {
      type: Date,
      default: null,
    },
    // Soft-delete flag — owner can deactivate without losing history.
    active: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Prescription", prescriptionSchema);
