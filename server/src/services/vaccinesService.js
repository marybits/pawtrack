import Vaccine from "../models/Vaccine.js";

export function getVaccines(petId) {
  return Vaccine.find({ petId }).sort({ nextDue: 1 });
}

export function createVaccine(petId, data) {
  return Vaccine.create({ petId, ...data });
}

export function updateVaccine(id, data) {
  return Vaccine.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export function deleteVaccine(id) {
  return Vaccine.findByIdAndDelete(id);
}

export function findVaccineById(id) {
  return Vaccine.findById(id);
}
