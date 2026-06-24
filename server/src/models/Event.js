import mongoose from "mongoose";

export const EVENT_TYPES = ["meal", "medication", "activity", "litter", "poop", "treats"];

const eventSchema = new mongoose.Schema(
  {
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: EVENT_TYPES,
      required: [true, "Event type is required"],
    },
    // Shape varies by type — validated at the controller/Gemini layer, not here.
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    // When the event actually happened in the real world.
    // Separate from createdAt so retroactive logging is possible.
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    // createdAt = when the record was inserted into MongoDB.
    // occurredAt = when the event happened (user-supplied).
    timestamps: true,
  }
);

// Compound index: most common query pattern is "events for this pet, sorted by time".
eventSchema.index({ petId: 1, occurredAt: -1 });

export default mongoose.model("Event", eventSchema);
