import {
  getVaccines,
  createVaccine,
  updateVaccine,
  deleteVaccine,
  findVaccineById,
} from "../services/vaccinesService.js";

export async function listVaccines(req, res) {
  try {
    const vaccines = await getVaccines(req.params.petId);
    res.json(vaccines);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
}

export async function addVaccine(req, res) {
  const { name, lastGiven, nextDue, notes, clinic } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "name is required" });
  try {
    const vaccine = await createVaccine(req.params.petId, { name, lastGiven, nextDue, notes, clinic });
    res.status(201).json(vaccine);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
}

export async function editVaccine(req, res) {
  try {
    const vaccine = await findVaccineById(req.params.id);
    if (!vaccine) return res.status(404).json({ message: "Vaccine not found" });
    if (String(vaccine.petId) !== req.params.petId)
      return res.status(403).json({ message: "Forbidden" });

    const { name, lastGiven, nextDue, notes, clinic } = req.body;
    const updated = await updateVaccine(req.params.id, { name, lastGiven, nextDue, notes, clinic });
    res.json(updated);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ message: "Vaccine not found" });
    res.status(500).json({ message: "Server error" });
  }
}

export async function removeVaccine(req, res) {
  try {
    const vaccine = await findVaccineById(req.params.id);
    if (!vaccine) return res.status(404).json({ message: "Vaccine not found" });
    if (String(vaccine.petId) !== req.params.petId)
      return res.status(403).json({ message: "Forbidden" });

    await deleteVaccine(req.params.id);
    res.status(204).end();
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ message: "Vaccine not found" });
    res.status(500).json({ message: "Server error" });
  }
}
