import { GoogleGenAI, Type } from "@google/genai";

const EVENT_TYPES = ["meal", "medication", "activity", "litter", "poop", "treats", "weight"];

// ── System instruction ────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `\
You extract structured pet care events from natural-language messages.
Output MUST be a single JSON object matching the schema. No prose, no markdown — just JSON.
Output values must always be in English.

CHAIN-OF-THOUGHT FOR NUMBERS — apply this reasoning for every message:
  "Tom went for a 30 minute walk"
    → type='activity' → durationMin MUST be 30, unit MUST be 'min', name='walk'
  "Luna ate half a cup of kibble at 7am"
    → type='meal' → amount MUST be 0.5, unit MUST be 'cup', food='kibble', finished=null (not mentioned)
  "Max wolfed down his food and kept begging for more"
    → type='meal' → finished='all', askedForMore=true
  "Charlie only ate half his bowl and walked away"
    → type='meal' → finished='partial', askedForMore=false
  "Bella refused her breakfast completely"
    → type='meal' → finished='refused', askedForMore=false
  "gave Mochi 5mg flea pill"
    → type='medication' → dose MUST be 5, unit MUST be 'mg', name='flea pill'
  "scooped the litter box"
    → type='litter' → action='scooped' (no numeric fields)
  "Tom weighed 4.2 kg today"
    → type='weight' → weightKg MUST be 4.2, unit='kg'
  "Bella is 9.5 lbs now"
    → type='weight' → weightKg MUST be 9.5, unit='lbs'

CRITICAL CONSTRAINTS:
- NEVER leave durationMin, amount, dose, quantity, or weightKg null if a number is mentioned in the text.
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
        amount:      { type: Type.NUMBER,  nullable: true, description: "Numeric quantity (e.g. 0.5, 1, 2)." },
        unit:        { type: Type.STRING,  nullable: true, enum: ["cup", "cups", "g", "oz", "can", "serving"] },
        food:        { type: Type.STRING,  nullable: true, description: "Food name, e.g. 'kibble', 'wet food'." },
        finished:    { type: Type.STRING,  nullable: true, enum: ["all", "partial", "refused"],
                       description: "'all' if pet finished everything, 'partial' if left some, 'refused' if did not eat. Null if not mentioned." },
        askedForMore:{ type: Type.BOOLEAN, nullable: true,
                       description: "true if pet begged, whined, or showed hunger after eating. false or null if not mentioned." },
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
    {
      // ── weight ────────────────────────────────────────────────────────────
      type: Type.OBJECT,
      description: "Use this branch when type='weight'. weightKg is REQUIRED — never omit it when a weight is stated.",
      required: ["weightKg"],
      properties: {
        weightKg: { type: Type.NUMBER, description: "The weight value as given (numeric only). '4.2 kg'→4.2, '9.5 lbs'→9.5." },
        unit:     { type: Type.STRING, nullable: true, enum: ["kg", "lbs"] },
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
  meal:       new Set(["amount", "unit", "food", "finished", "askedForMore"]),
  medication: new Set(["name", "dose", "unit"]),
  activity:   new Set(["name", "duration", "unit"]),
  litter:     new Set(["action"]),
  poop:       new Set(["consistency", "color"]),
  treats:     new Set(["name", "quantity"]),
  weight:     new Set(["weightKg", "unit"]),
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
    parsed.occurredAt = nowUtc;
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

// ── Health insights ───────────────────────────────────────────────────────────

const INSIGHTS_SYSTEM = `\
You are a knowledgeable pet health assistant analyzing care log data.
Generate 3–6 specific, data-driven health insights.

Rules:
- Every insight MUST cite concrete numbers from the data (e.g. "7 of 12 meals were refused").
- Vary insight levels: include positives (great habits), info (neutral patterns), and warns (concerns) as warranted.
- Keep each insight to 1–3 sentences.
- For health concerns always recommend vet consultation — never diagnose.
- If fewer than 5 total events are logged, produce a single "info" insight noting that more data is needed.
- Output MUST be valid JSON only — no prose, no markdown fences.`;

const insightSchema = {
  type: Type.OBJECT,
  properties: {
    insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.STRING, enum: ["positive", "info", "warn"] },
          title: { type: Type.STRING, description: "3–6 word title" },
          text:  { type: Type.STRING, description: "1–3 sentence insight citing data numbers" },
        },
        required: ["level", "title", "text"],
      },
    },
  },
  required: ["insights"],
};

export async function generateHealthInsights(petName, species, events, prescriptions) {
  const now   = new Date();
  const msAgo = (days) => new Date(now - days * 86_400_000);

  const meals     = events.filter((e) => e.type === "meal");
  const activity  = events.filter((e) => e.type === "activity");
  const weightEvs = events.filter((e) => e.type === "weight" && e.details?.weightKg != null);
  const poop      = events.filter((e) => e.type === "poop");

  const uniqueDays = new Set(events.map((e) => new Date(e.occurredAt).toDateString())).size;

  let summary = `Pet: ${petName} (${species ?? "unknown species"})\n`;
  summary    += `Data window: last 30 days — ${events.length} total events across ${uniqueDays} days\n\n`;

  // ── Meals ──────────────────────────────────────────────────────────────────
  if (meals.length > 0) {
    const refused = meals.filter((m) => m.details?.finished === "refused").length;
    const partial = meals.filter((m) => m.details?.finished === "partial").length;
    const all     = meals.filter((m) => m.details?.finished === "all").length;
    const hungry  = meals.filter((m) => m.details?.askedForMore).length;

    const last7  = meals.filter((m) => new Date(m.occurredAt) >= msAgo(7));
    const prior7 = meals.filter((m) => new Date(m.occurredAt) >= msAgo(14) && new Date(m.occurredAt) < msAgo(7));
    const l7ref  = last7.filter((m)  => m.details?.finished === "refused").length;
    const p7ref  = prior7.filter((m) => m.details?.finished === "refused").length;

    const wdMeals = meals.filter((m) => { const d = new Date(m.occurredAt).getDay(); return d >= 1 && d <= 5; });
    const weMeals = meals.filter((m) => { const d = new Date(m.occurredAt).getDay(); return d === 0 || d === 6; });

    summary += `MEALS (${meals.length} total):\n`;
    summary += `  Finished all: ${all} | Left some: ${partial} | Refused: ${refused} | Asked for more: ${hungry}\n`;
    summary += `  Last 7 days: ${last7.length} meals, ${l7ref} refusals\n`;
    summary += `  Prior 7 days: ${prior7.length} meals, ${p7ref} refusals\n`;
    if (wdMeals.length > 0 && weMeals.length > 0) {
      summary += `  Weekday avg: ${(wdMeals.length / 21).toFixed(1)}/day | Weekend avg: ${(weMeals.length / 9).toFixed(1)}/day\n`;
    }
  } else {
    summary += `MEALS: none logged\n`;
  }

  // ── Activity ───────────────────────────────────────────────────────────────
  if (activity.length > 0) {
    const toMin  = (e) => { const d = Number(e.details?.duration) || 0; return e.details?.unit === "hr" ? d * 60 : d; };
    const total  = activity.reduce((s, e) => s + toMin(e), 0);
    const avg    = Math.round(total / activity.length);
    const last7  = activity.filter((e) => new Date(e.occurredAt) >= msAgo(7));
    const prior7 = activity.filter((e) => new Date(e.occurredAt) >= msAgo(14) && new Date(e.occurredAt) < msAgo(7));

    summary += `ACTIVITY (${activity.length} sessions, ${total} min total, avg ${avg} min/session):\n`;
    summary += `  Last 7 days: ${last7.length} sessions, ${last7.reduce((s, e) => s + toMin(e), 0)} min\n`;
    summary += `  Prior 7 days: ${prior7.length} sessions, ${prior7.reduce((s, e) => s + toMin(e), 0)} min\n`;
  } else {
    summary += `ACTIVITY: none logged\n`;
  }

  // ── Weight ─────────────────────────────────────────────────────────────────
  if (weightEvs.length > 0) {
    const sorted = [...weightEvs].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
    const first  = sorted[0];
    const latest = sorted[sorted.length - 1];
    const delta  = +(Number(latest.details.weightKg) - Number(first.details.weightKg)).toFixed(2);
    summary += `WEIGHT (${weightEvs.length} measurements):\n`;
    summary += `  First: ${first.details.weightKg} kg on ${new Date(first.occurredAt).toLocaleDateString()}\n`;
    summary += `  Latest: ${latest.details.weightKg} kg on ${new Date(latest.occurredAt).toLocaleDateString()}\n`;
    summary += `  Change: ${delta > 0 ? "+" : ""}${delta} kg\n`;
  }

  // ── Bathroom ───────────────────────────────────────────────────────────────
  if (poop.length > 0) {
    const normal = poop.filter((p) => p.details?.consistency === "normal").length;
    const loose  = poop.filter((p) => p.details?.consistency === "loose").length;
    const liquid = poop.filter((p) => p.details?.consistency === "liquid").length;
    summary += `BATHROOM (${poop.length} logged):\n`;
    summary += `  Normal: ${normal} | Loose: ${loose} | Liquid: ${liquid}\n`;
  }

  // ── Medications ────────────────────────────────────────────────────────────
  if (prescriptions.length > 0) {
    summary += `MEDICATIONS:\n`;
    for (const rx of prescriptions) {
      const name     = rx.medicationName ?? rx.name ?? "Unknown";
      const expected = Math.round(30 * 24 / rx.intervalHours);
      const logged   = events.filter(
        (e) =>
          e.type === "medication" &&
          ((e.details?.prescriptionId != null && String(e.details.prescriptionId) === String(rx._id)) ||
           (e.details?.name ?? "").toLowerCase() === name.toLowerCase())
      ).length;
      const pct = expected > 0 ? Math.round((logged / expected) * 100) : 0;
      summary += `  ${name} (every ${rx.intervalHours}h): ${logged}/${expected} doses logged (${pct}% adherence)\n`;
    }
  }

  const response = await getClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze and generate health insights for this pet's 30-day care data:\n\n${summary}`,
    config: {
      systemInstruction: INSIGHTS_SYSTEM,
      responseMimeType: "application/json",
      responseSchema: insightSchema,
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${response.text}`);
  }

  return Array.isArray(parsed.insights) ? parsed.insights : [];
}
