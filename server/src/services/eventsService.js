import Event from "../models/Event.js";

export async function createEvent(petId, { type, details, notes, occurredAt }) {
  const event = new Event({
    petId,
    type,
    details: details ?? {},
    notes: notes ?? null,
    occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
  });
  await event.save();
  return event;
}

/**
 * Returns events for a pet sorted by occurredAt descending.
 * Optional filters: type (string), from (ISO date), to (ISO date).
 */
export async function findEventsByPet(petId, { type, from, to } = {}) {
  const filter = { petId };

  if (type) {
    filter.type = type;
  }

  if (from || to) {
    filter.occurredAt = {};
    if (from) filter.occurredAt.$gte = new Date(from);
    if (to) {
      // If `to` is a date-only string (YYYY-MM-DD), extend to end of that day
      // so events logged during the day are included.
      const toDate = new Date(to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
      filter.occurredAt.$lte = toDate;
    }
  }

  return Event.find(filter).sort({ occurredAt: -1 });
}
