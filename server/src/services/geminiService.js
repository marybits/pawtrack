import { GoogleGenAI, Type } from "@google/genai";

const EVENT_TYPES = ["meal", "medication", "activity", "litter", "poop", "treats"];

// ── System instruction ────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `\
You extract structured pet care events from natural-language messages.
Output MUST be a single JSON object matching the schema. No prose, no markdown — just JSON.
Output values must always be in English.

CHAIN-OF-THOUGHT FOR NUMBERS — apply this reasoning for every message:
  "Tom went for a 30 minute walk"
    → type='activity' → durationMin MUST be 30, unit MUST be 'min', name='walk'
  "Luna ate half a cup of kibble at 7am"
    → type='meal' → amount MUST be 0.5, unit MUST be 'cup', food='kibble'
  "gave Mochi 5mg flea pill"
    → type='medication' → dose MUST be 5, unit MUST be 'mg', name='flea pill'
  "scooped the litter box"
    → type='litter' → action='scooped' (no numeric fields)

CRITICAL CONSTRAINTS:
- NEVER leave durationMin, amount, dose, or quantity null if a number is mentioned in the text.
- If type='activity' and any duration is mentioned, durationMin MUST contain that number.
- "occurredAt" must be ISO 8601 UTC. Use the reference time in the prompt as "now".
  Resolve relative phrases ("an hour ago", "this morning") using that reference time.
- Anything that doesn't fit a structured field goes in "notes".`;

// ── Details schema — anyOf with per-type required fields ─────────────────────
// Using anyOf lets us declare required fields conditionally per event type.
// The description on each branch tells the model which branch to select.
// The 'required' array on the activity branch forces durationMin to be filled.
const detailsSchema = {
  anyOf: [
    {
      // ── activity ──────────────────────────────────────────────────────────
      type: Type.OBJECT,
      description:
        "Use this branch when type='activity'. " +
        "durationMin is REQUIRED — never omit it when a duration is stated.",
      required: ["name", "durationMin", "unit"],
      properties: {
        name:        { type: Type.STRING, description: "Activity name, e.g. 'walk', 'run', 'play'." },
        durationMin: { type: Type.NUMBER, description: "Duration in minutes. '30 minute walk'→30. '1 hour run'→60." },
        unit:        { type: Type.STRING, enum: ["min", "hr", "km", "miles", "m"] },
      },
    },
    {
      // ── meal ──────────────────────────────────────────────────────────────
      type: Type.OBJECT,
      description: "Use this branch when type='meal'.",
      properties: {
        amount: { type: Type.NUMBER, nullable: true, description: "Numeric quantity (e.g. 0.5, 1, 2)." },
        unit:   { type: Type.STRING, nullable: true, enum: ["cup", "cups", "g", "oz", "can", "serving"] },
        food:   { type: Type.STRING, nullable: true, description: "Food name, e.g. 'kibble', 'wet food'." },
      },
    },
    {
      // ── medication ────────────────────────────────────────────────────────
      type: Type.OBJECT,
      description: "Use this branch when type='medication'.",
      properties: {
        name: { type: Type.STRING, nullable: true, description: "Medication name." },
        dose: { type: Type.NUMBER, nullable: true, description: "Numeric dose amount." },
        unit: { type: Type.STRING, nullable: true, enum: ["mg", "ml", "pill", "pills", "tablet", "drop"] },
      },
    },
    {
      // ── litter ────────────────────────────────────────────────────────────
      type: Type.OBJECT,
      description: "Use this branch when type='litter'.",
      properties: {
        action: { type: Type.STRING, nullable: true, enum: ["scooped", "cleaned", "refilled"] },
      },
    },
    {
      // ── poop ──────────────────────────────────────────────────────────────
      type: Type.OBJECT,
      description: "Use this branch when type='poop'.",
      properties: {
        consistency: { type: Type.STRING, nullable: true, enum: ["normal", "loose", "solid", "liquid"] },
        color:       { type: Type.STRING, nullable: true, description: "English color word." },
      },
    },
    {
      // ── treats ────────────────────────────────────────────────────────────
      type: Type.OBJECT,
      description: "Use this branch when type='treats'.",
      properties: {
        name:     { type: Type.STRING, nullable: true, description: "Treat name." },
        quantity: { type: Type.NUMBER, nullable: true, description: "Number of treats given." },
      },
    },
  ],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: EVENT_TYPES,
      description: "The kind of pet care event being logged.",
    },
    occurredAt: {
      type: Type.STRING,
      description:
        "ISO 8601 UTC datetime (e.g. 2026-06-24T07:00:00.000Z). " +
        "Resolve relative phrases using the reference time in the prompt.",
    },
    details: detailsSchema,
    notes: {
      type: Type.STRING,
      nullable: true,
      description: "Free-text English context that does not fit any structured field.",
    },
  },
  required: ["type", "occurredAt", "details"],
};

// Post-extraction field allowlists — strips cross-contamination after mapping.
const TYPE_DETAIL_FIELDS = {
  meal:       new Set(["amount", "unit", "food"]),
  medication: new Set(["name", "dose", "unit"]),
  activity:   new Set(["name", "duration", "unit"]),
  litter:     new Set(["action"]),
  poop:       new Set(["consistency", "color"]),
  treats:     new Set(["name", "quantity"]),
};

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _client;
}

export async function parseEventFromText(text, petName, timezone) {
  const nowUtc = new Date().toISOString();

  // Build a local time string so Gemini can resolve "7am" in the user's timezone.
  let localTimeNote = "";
  if (timezone) {
    try {
      const localStr = new Date().toLocaleString("en-CA", {
        timeZone: timezone,
        hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
      localTimeNote = `\nUser's local time: ${localStr} (${timezone}) — interpret bare times like "7am" in THIS timezone, then convert to UTC for occurredAt.`;
    } catch {
      // invalid timezone string — fall back to UTC only
    }
  }

  const subject = petName ? `Pet: "${petName}"` : "";

  const prompt =
    `Reference time (UTC): ${nowUtc}${localTimeNote}\n` +
    (subject ? `${subject}\n` : "") +
    `User message: """${text}"""`;

  const response = await getClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${response.text}`);
  }

  // Clamp occurredAt to now if model produced a future time.
  if (parsed.occurredAt && new Date(parsed.occurredAt) > new Date()) {
    parsed.occurredAt = now;
  }

  // Map durationMin → duration (client components use "duration").
  if (parsed.details?.durationMin != null) {
    parsed.details.duration = parsed.details.durationMin;
    if (!parsed.details.unit) parsed.details.unit = "min";
  }
  delete parsed.details?.durationMin;

  // Strip null values and fields outside the allowed set for the inferred type.
  if (parsed.details && typeof parsed.details === "object") {
    const allowed = TYPE_DETAIL_FIELDS[parsed.type];
    for (const [key, val] of Object.entries(parsed.details)) {
      if (val === null || val === undefined) {
        delete parsed.details[key];
      } else if (allowed && !allowed.has(key)) {
        delete parsed.details[key];
      }
    }
  }

  return parsed;
}
