import { apiFetch } from "./apiClient.js";

export const getPets = () => apiFetch("/api/pets");

export const getPetById = (id) => apiFetch(`/api/pets/${id}`);

export const registerPet = ({ name, species, breed, age, weight }) =>
  apiFetch("/api/pets", {
    method: "POST",
    body: JSON.stringify({ name, species, breed, age, weight }),
  });
