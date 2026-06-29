import {
  createPrescription,
  findPrescriptionsByPet,
  findPrescriptionById,
  updatePrescription,
} from "../services/prescriptionsService.js";

export async function listPrescriptions(req, res) {
  try {
    const activeOnly = req.query.active === "true";
    const rxs = await findPrescriptionsByPet(req.params.petId, { activeOnly });
    return res.status(200).json(rxs);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function addPrescription(req, res) {
  const { medicationName, intervalHours, dose, doseUnit, startDate, endDate, notes } = req.body;

  if (!medicationName || !intervalHours) {
    return res.status(400).json({ message: "medicationName and intervalHours are required" });
  }
  if (typeof intervalHours !== "number" || intervalHours < 1) {
    return res.status(400).json({ message: "intervalHours must be a positive number" });
  }

  try {
    const rx = await createPrescription(req.params.petId, {
      medicationName,
      intervalHours,
      dose:     dose     != null ? Number(dose) : undefined,
      doseUnit: doseUnit ?? undefined,
      startDate,
      endDate,
      notes,
    });
    return res.status(201).json(rx);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    return res.status(500).json({ message: "Server error" });
  }
}

export async function patchPrescription(req, res) {
  try {
    const rx = await findPrescriptionById(req.params.rxId);
    if (!rx) return res.status(404).json({ message: "Prescription not found" });

    // Ensure the prescription belongs to the pet in the URL
    if (String(rx.petId) !== req.params.petId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const allowed = ["medicationName", "intervalHours", "dose", "doseUnit", "startDate", "endDate", "active", "notes"];
    const patch = {};
    allowed.forEach((k) => { if (k in req.body) patch[k] = req.body[k]; });

    const updated = await updatePrescription(rx._id, patch);
    return res.status(200).json(updated);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ message: "Prescription not found" });
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    return res.status(500).json({ message: "Server error" });
  }
}
