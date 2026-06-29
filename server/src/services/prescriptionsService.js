import Prescription from "../models/Prescription.js";

export async function createPrescription(petId, { medicationName, intervalHours, dose, doseUnit, startDate, endDate, notes }) {
  const rx = new Prescription({
    petId,
    medicationName,
    intervalHours,
    dose:      dose     ?? null,
    doseUnit:  doseUnit ?? null,
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate:   endDate   ? new Date(endDate)   : null,
    notes:     notes     ?? null,
  });
  await rx.save();
  return rx;
}

export async function findPrescriptionsByPet(petId, { activeOnly = false } = {}) {
  const filter = { petId };
  if (activeOnly) filter.active = true;
  return Prescription.find(filter).sort({ createdAt: -1 });
}

export async function findPrescriptionById(id) {
  return Prescription.findById(id);
}

// Partial update — only touches fields explicitly provided.
export async function updatePrescription(id, patch) {
  return Prescription.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
}
