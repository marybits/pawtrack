import { apiFetch } from "./apiClient.js";

export function getVaccines(petId) {
  return apiFetch(`/api/pets/${petId}/vaccines`);
}

export function createVaccine(petId, data) {
  return apiFetch(`/api/pets/${petId}/vaccines`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateVaccine(petId, vaccineId, data) {
  return apiFetch(`/api/pets/${petId}/vaccines/${vaccineId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteVaccine(petId, vaccineId) {
  return apiFetch(`/api/pets/${petId}/vaccines/${vaccineId}`, {
    method: "DELETE",
  });
}
