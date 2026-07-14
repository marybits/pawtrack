import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePetOwnership } from "../middleware/requirePetOwnership.js";
import { generateVetReport } from "../services/reportService.js";
import Pet from "../models/Pet.js";

const router = Router({ mergeParams: true }); // inherit :petId from parent

router.use(requireAuth, requirePetOwnership);

router.get("/", async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 7), 90);

  try {
    const pet = await Pet.findById(req.params.petId);
    if (!pet) return res.status(404).json({ message: "Pet not found" });

    const filename = `${pet.name.replace(/[^a-z0-9]/gi, "_")}_vet_report_${days}d.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const concern = (req.query.concern ?? "").trim().slice(0, 200);
    await generateVetReport(pet, days, concern, res);
  } catch (err) {
    console.error("Report generation error:", err);
    // Only send error JSON if headers haven't been flushed yet
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate report" });
    }
  }
});

export default router;
