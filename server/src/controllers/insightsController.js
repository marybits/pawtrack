import { findEventsByPet }        from "../services/eventsService.js";
import { findPrescriptionsByPet }  from "../services/prescriptionsService.js";
import { generateHealthInsights }  from "../services/geminiService.js";

/**
 * POST /api/pets/:petId/insights
 *
 * Fetches the pet's last 30 days of events and prescriptions, then asks
 * Gemini to surface behavioral health patterns as structured insight cards.
 *
 * req.pet is already populated by requirePetOwnership — no redundant DB fetch.
 */
export async function getInsights(req, res) {
  try {
    const pet  = req.pet;
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const [events, prescriptions] = await Promise.all([
      findEventsByPet(pet._id, { from: from.toISOString() }),
      findPrescriptionsByPet(pet._id),
    ]);

    const insights = await generateHealthInsights(
      pet.name,
      pet.species ?? "pet",
      events,
      prescriptions,
    );

    return res.status(200).json({ insights });
  } catch (err) {
    console.error("Insights error:", err.message);
    return res.status(500).json({ message: "Could not generate insights." });
  }
}
