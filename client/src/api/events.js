import { apiFetch } from "./apiClient.js";

export const logEvent = (petId, data) =>
  apiFetch(`/api/pets/${petId}/events`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getEvents = (petId, params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  return apiFetch(`/api/pets/${petId}/events${qs ? `?${qs}` : ""}`);
};
