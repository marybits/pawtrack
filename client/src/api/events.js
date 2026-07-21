import { apiFetch } from "./apiClient.js";

export const logEvent = (petId, data) =>
  apiFetch(`/api/pets/${petId}/events`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const parseEvent = (text, petName, species) =>
  apiFetch("/api/events/parse", {
    method: "POST",
    body: JSON.stringify({
      text,
      petName,
      species,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });

export const getEvents = (petId, params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  return apiFetch(`/api/pets/${petId}/events${qs ? `?${qs}` : ""}`);
};

export const updateEvent = (petId, eventId, data) =>
  apiFetch(`/api/pets/${petId}/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteEvent = (petId, eventId) =>
  apiFetch(`/api/pets/${petId}/events/${eventId}`, { method: "DELETE" });
