import { Router } from "express";
import { parseEvent } from "../controllers/parseController.js";

const router = Router();

/**
 * @swagger
 * /api/events/parse:
 *   post:
 *     tags: [AI]
 *     summary: Parse a plain-English description into a structured event object using Gemini
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text, petId]
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Bella ate half her food at 7am"
 *               petId:
 *                 type: string
 *               timezone:
 *                 type: string
 *                 example: "America/Toronto"
 *     responses:
 *       200:
 *         description: Parsed event preview (not yet saved — client confirms before saving)
 *       422:
 *         description: Could not parse — rephrasing may help
 *       503:
 *         description: AI service temporarily unavailable
 */
// Auth is applied in app.js at mount time.
router.post("/", parseEvent);

export default router;
