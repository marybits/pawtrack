import mongoose from "mongoose";

const vaccineSchema = new mongoose.Schema(
  {
    petId:     { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    name:      { type: String, required: true, trim: true },
    lastGiven: { type: Date, default: null },
    nextDue:   { type: Date, default: null },
    notes:     { type: String, trim: true, default: "" },
    clinic:    { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Vaccine", vaccineSchema);
