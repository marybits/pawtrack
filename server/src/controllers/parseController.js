import { parseEventFromText } from "../services/geminiService.js";

/**
 * POST /api/events/parse
 * Body: { text: string, petName?: string }
 *
 * Calls Gemini to extract a structured event from plain text.
 * Returns the preview object — nothing is saved to the database here.
 * The client shows the preview, lets the user edit it, then calls
 * POST /api/pets/:petId/events to actually persist the confirmed event.
 */
export async function parseEvent(req, res) {
  const { text, petName, timezone, species } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ message: "text is required" });
  }

  if (text.trim().length > 500) {
    return res.status(400).json({ message: "text must be 500 characters or fewer" });
  }

  // Sanitize timezone — must be a plausible IANA string.
  const safeTz = (typeof timezone === "string" && /^[\w+\-\/]{1,50}$/.test(timezone))
    ? timezone
    : undefined;

  // Sanitize petName — short string only, never lands verbatim in the Gemini prompt unsanitized.
  const safePetName = (typeof petName === "string" && petName.trim().length <= 50)
    ? petName.trim()
    : undefined;

  // Sanitize species — only trust short alpha strings.
  const safeSpecies = (typeof species === "string" && /^[a-zA-Z]{1,30}$/.test(species.trim()))
    ? species.trim().toLowerCase()
    : undefined;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ message: "AI parsing is not configured on this server." });
  }

  try {
    const preview = await parseEventFromText(text.trim(), safePetName, safeTz, safeSpecies);
    return res.status(200).json(preview);
  } catch (err) {
    console.error("[gemini] parse error:", err.message);

    if (err.code === "QUOTA_EXCEEDED") {
      return res.status(503).json({
        message:
          "The AI service is temporarily unavailable (quota limit reached) — please use the Structured Form instead.",
      });
    }
    if (err.code === "API_ERROR") {
      return res.status(503).json({
        message:
          "The AI service is temporarily unavailable — please use the Structured Form instead.",
      });
    }
    // PARSE_ERROR or unexpected — rephrasing may genuinely help here
    return res.status(502).json({
      message: "Couldn't understand that — try rephrasing or use the Structured Form.",
    });
  }
}
