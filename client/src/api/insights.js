import { apiFetch } from "./apiClient.js";

export const fetchInsights = (petId) =>
  apiFetch(`/api/pets/${petId}/insights`, { method: "POST" });
