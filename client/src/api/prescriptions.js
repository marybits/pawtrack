import { apiFetch } from "./apiClient.js";

export const getPrescriptions = (petId, { activeOnly = false } = {}) =>
  apiFetch(`/api/pets/${petId}/prescriptions${activeOnly ? "?active=true" : ""}`);

export const addPrescription = (petId, data) =>
  apiFetch(`/api/pets/${petId}/prescriptions`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// Use to deactivate (patch { active: false }) or edit any other field.
export const patchPrescription = (petId, rxId, patch) =>
  apiFetch(`/api/pets/${petId}/prescriptions/${rxId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
