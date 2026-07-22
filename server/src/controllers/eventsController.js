import { createEvent, findEventsByPet, updateEvent, deleteEvent } from "../services/eventsService.js";
import { EVENT_TYPES } from "../models/Event.js";

export async function logEvent(req, res) {
  const { type, details, notes, occurredAt } = req.body;

  if (!type) {
    return res.status(400).json({ message: "type is required" });
  }

  if (!EVENT_TYPES.includes(type)) {
    return res.status(400).json({
      message: `type must be one of: ${EVENT_TYPES.join(", ")}`,
    });
  }

  if (occurredAt && new Date(occurredAt) > new Date()) {
    return res.status(400).json({ message: "occurredAt cannot be in the future" });
  }

  try {
    const event = await createEvent(req.params.petId, {
      type,
      details,
      notes,
      occurredAt,
    });
    return res.status(201).json(event);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function editEvent(req, res) {
  const { eventId } = req.params;
  const { type, details, notes, occurredAt } = req.body;

  if (type && !EVENT_TYPES.includes(type)) {
    return res.status(400).json({ message: `type must be one of: ${EVENT_TYPES.join(", ")}` });
  }

  if (occurredAt && new Date(occurredAt) > new Date()) {
    return res.status(400).json({ message: "occurredAt cannot be in the future" });
  }

  try {
    const event = await updateEvent(eventId, req.params.petId, { type, details, notes, occurredAt });
    if (!event) return res.status(404).json({ message: "Event not found" });
    return res.status(200).json(event);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function removeEvent(req, res) {
  const { eventId } = req.params;
  try {
    const event = await deleteEvent(eventId, req.params.petId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    return res.status(200).json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listEvents(req, res) {
  const { type, from, to } = req.query;

  if (type && !EVENT_TYPES.includes(type)) {
    return res.status(400).json({
      message: `type must be one of: ${EVENT_TYPES.join(", ")}`,
    });
  }

  try {
    const events = await findEventsByPet(req.params.petId, { type, from, to });
    return res.status(200).json(events);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}
