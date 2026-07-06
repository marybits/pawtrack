/**
 * seed-events.js
 *
 * Populates the last 14 days with realistic fake events for one pet.
 *
 * Usage:
 *   node scripts/seed-events.js                      # seeds ALL pets
 *   node scripts/seed-events.js <petId>              # seeds a specific pet
 *   node scripts/seed-events.js --clear              # clears + reseeds ALL pets
 *   node scripts/seed-events.js <petId> --clear      # clears + reseeds one pet
 *
 * Run from the /server directory.
 */

import "dotenv/config";
import mongoose from "mongoose";
import Pet from "../src/models/Pet.js";
import Event from "../src/models/Event.js";

// ── Config ──────────────────────────────────────────────────────────────────
const DAYS = 14;

// ── Helpers ─────────────────────────────────────────────────────────────────
function daysAgo(n, hour = 8, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitter(n, range = 10) {
  return n + Math.floor(Math.random() * range * 2) - range;
}

// ── Event generators ─────────────────────────────────────────────────────────
function makeMeal(petId, date) {
  const foods = ["Royal Canin", "Hill's Science Diet", "Purina Pro Plan", "wet food", "dry kibble"];
  const amounts = [0.5, 0.75, 1, 1.25];
  const units = ["cup", "cups", "can"];
  const finished = pick(["all", "all", "all", "partial", "refused"]);
  return {
    petId,
    type: "meal",
    occurredAt: date,
    details: {
      food: pick(foods),
      amount: pick(amounts),
      unit: pick(units),
      finished,
      askedForMore: finished === "all" && Math.random() > 0.6,
    },
  };
}

function makeActivity(petId, date) {
  const activities = ["walk", "play", "run", "fetch", "indoor play"];
  const durations = [15, 20, 25, 30, 45, 60];
  return {
    petId,
    type: "activity",
    occurredAt: date,
    details: {
      name: pick(activities),
      duration: pick(durations),
      unit: "min",
    },
  };
}

function makeMedication(petId, date) {
  return {
    petId,
    type: "medication",
    occurredAt: date,
    details: {
      name: "Thyroid medication",
      dose: 2.5,
      unit: "mg",
    },
    notes: "given with food",
  };
}

function makePoop(petId, date) {
  const consistencies = ["normal", "normal", "normal", "soft", "firm"];
  const colors = ["brown", "dark brown", "medium brown"];
  return {
    petId,
    type: "poop",
    occurredAt: date,
    details: {
      consistency: pick(consistencies),
      color: pick(colors),
    },
  };
}

function makeLitter(petId, date) {
  return {
    petId,
    type: "litter",
    occurredAt: date,
    details: { action: pick(["cleaned", "scooped", "full change"]) },
  };
}

function makeTreats(petId, date) {
  const treats = ["dental chew", "chicken treat", "training treats", "catnip toy"];
  return {
    petId,
    type: "treats",
    occurredAt: date,
    details: {
      name: pick(treats),
      quantity: pick([1, 2, 3]),
    },
  };
}

function makeWeight(petId, date, baseKg) {
  // Slight drift ±0.2 kg around base
  const kg = Math.round((baseKg + (Math.random() - 0.5) * 0.4) * 10) / 10;
  return {
    petId,
    type: "weight",
    occurredAt: date,
    details: { weightKg: kg, unit: "kg" },
  };
}

// ── Build event schedule ────────────────────────────────────────────────────
function buildSchedule(petId, species) {
  const events = [];
  const isCat = species?.toLowerCase().includes("cat");
  const baseWeight = isCat ? 4.2 : 12.5;

  for (let day = DAYS; day >= 0; day--) {
    // Skip a random day here and there (streak breaker, realistic)
    if (day > 0 && day < DAYS && Math.random() < 0.07) continue;

    // Morning meal ~7–8am
    events.push(makeMeal(petId, daysAgo(day, jitter(7, 1), pick([0, 15, 30]))));

    // Evening meal ~5–7pm
    events.push(makeMeal(petId, daysAgo(day, jitter(18, 1), pick([0, 30]))));

    // Daily medication ~8am
    events.push(makeMedication(petId, daysAgo(day, 8, pick([0, 10, 20]))));

    // Activity — once or twice a day
    events.push(makeActivity(petId, daysAgo(day, jitter(10, 2), pick([0, 15, 30]))));
    if (Math.random() > 0.4) {
      events.push(makeActivity(petId, daysAgo(day, jitter(17, 1), pick([0, 15]))));
    }

    // Poop — 1–2x per day
    events.push(makePoop(petId, daysAgo(day, jitter(9, 2), 0)));
    if (Math.random() > 0.5) {
      events.push(makePoop(petId, daysAgo(day, jitter(20, 2), 0)));
    }

    // Litter — once per day (cats), skip for dogs
    if (isCat) {
      events.push(makeLitter(petId, daysAgo(day, jitter(12, 3), 0)));
    }

    // Treats — most days
    if (Math.random() > 0.25) {
      events.push(makeTreats(petId, daysAgo(day, jitter(15, 3), 0)));
    }

    // Weight — every 3–4 days
    if (day % 3 === 0) {
      events.push(makeWeight(petId, daysAgo(day, 9, 0), baseWeight));
    }
  }

  return events;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✓ Connected to MongoDB");

  const petIdArg = process.argv[2]?.startsWith("--") ? undefined : process.argv[2];
  const clear    = process.argv.includes("--clear");

  const pets = petIdArg
    ? [await Pet.findById(petIdArg)]
    : await Pet.find();

  if (!pets.length || !pets[0]) {
    console.error("✗ No pets found. Register a pet in the app first.");
    process.exit(1);
  }

  const types = ["meal", "medication", "activity", "poop", "litter", "treats", "weight"];

  for (const pet of pets) {
    console.log(`\n→ ${pet.name} (${pet._id})`);

    if (clear) {
      const { deletedCount } = await Event.deleteMany({ petId: pet._id });
      console.log(`  Cleared ${deletedCount} existing events`);
    }

    const events = buildSchedule(pet._id, pet.species);
    await Event.insertMany(events);
    console.log(`  Inserted ${events.length} events over the last ${DAYS} days`);
    for (const t of types) {
      const count = events.filter((e) => e.type === t).length;
      if (count) console.log(`    ${t.padEnd(12)} ${count}`);
    }
  }

  await mongoose.disconnect();
  console.log("\n✓ Done — refresh the app to see your data");
}

main().catch((err) => { console.error(err); process.exit(1); });
