import { Router }      from "express";
import { getInsights } from "../controllers/insightsController.js";

// mergeParams: true so req.params.petId (from the parent route) is accessible.
const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/pets/{petId}/insights:
 *   post:
 *     tags: [AI]
 *     summary: Generate AI health insights for a pet based on the last 30 days of events
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Narrative health insight string
 *       503:
 *         description: AI service temporarily unavailable
 */
router.post("/", getInsights);

export default router;
