/**
 * reportService.js — Vet health report, summary-first design.
 *
 * Each section shows patterns and totals, not individual event rows.
 * Goal: one clean page a vet can scan in 30 seconds.
 */

import PDFDocument from "pdfkit";
import Event from "../models/Event.js";
import Prescription from "../models/Prescription.js";

// ── Brand tokens ──────────────────────────────────────────────────────────
const BRAND   = "#3D3170";
const ACCENT  = "#E05C3A";
const GRAY    = "#6B7280";
const LIGHT   = "#F5F4F7";
const WHITE   = "#FFFFFF";
const BLACK   = "#111827";
const DIVIDER = "#E5E3EB";
const GREEN   = "#16A34A";
const AMBER   = "#D97706";
const RED     = "#DC2626";

// ── Layout ────────────────────────────────────────────────────────────────
const PW = 595.28;
const PH = 841.89;
const ML = 48;
const MR = 48;
const CW = PW - ML - MR;

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtShort(date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtTime(date) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function pct(n, total) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}
function intervalLabel(h) {
  if (h <= 13)  return "twice daily";
  if (h <= 25)  return "once daily";
  if (h <= 50)  return "every 2 days";
  if (h <= 98)  return "every 3 days";
  if (h <= 200) return "weekly";
  return `every ${Math.round(h / 24)} days`;
}

// ── Drawing primitives ────────────────────────────────────────────────────
function drawHRule(doc, y, color = DIVIDER) {
  doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor(color).lineWidth(0.5).stroke();
}

function sectionHeader(doc, title, y) {
  doc.rect(ML, y, CW, 20).fill(LIGHT);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND)
     .text(title.toUpperCase(), ML + 10, y + 6, { characterSpacing: 0.6 });
  return y + 20 + 8;
}

function checkPage(doc, y, needed = 40) {
  if (y + needed > PH - 48) {
    doc.addPage();
    return ML + 16;
  }
  return y;
}

// Small stat tile: value large, label below
function statTile(doc, x, y, w, h, value, label, color = BRAND) {
  doc.rect(x, y, w, h).fill(LIGHT);
  doc.font("Helvetica-Bold").fontSize(17).fillColor(color)
     .text(String(value), x, y + 6, { width: w, align: "center" });
  doc.font("Helvetica").fontSize(7).fillColor(GRAY)
     .text(label, x, y + 26, { width: w, align: "center" });
}

// Horizontal progress bar with label and percentage
function progressBar(doc, x, y, w, label, value, total, color = BRAND) {
  const barW = w - 110;
  const filled = total > 0 ? Math.round((value / total) * barW) : 0;
  const percentage = pct(value, total);

  doc.font("Helvetica").fontSize(8).fillColor(GRAY)
     .text(capitalize(label), x, y + 1, { width: 70 });

  doc.rect(x + 75, y + 3, barW, 7).fill(DIVIDER);
  if (filled > 0) doc.rect(x + 75, y + 3, filled, 7).fill(color);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLACK)
     .text(`${value}  `, x + 75 + barW + 6, y + 1, { continued: true })
     .font("Helvetica").fillColor(GRAY).text(percentage);

  return y + 14;
}

// ── Main export ───────────────────────────────────────────────────────────
export async function generateVetReport(pet, days, outStream) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const [events, prescriptions] = await Promise.all([
    Event.find({ petId: pet._id, occurredAt: { $gte: from } }).sort({ occurredAt: -1 }),
    Prescription.find({ petId: pet._id }),
  ]);

  const meals      = events.filter((e) => e.type === "meal");
  const meds       = events.filter((e) => e.type === "medication");
  const activities = events.filter((e) => e.type === "activity");
  const weights    = events.filter((e) => e.type === "weight")
                           .sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
  const poops      = events.filter((e) => e.type === "poop");
  const litters    = events.filter((e) => e.type === "litter");
  const treats     = events.filter((e) => e.type === "treats");
  const activeRx   = prescriptions.filter((r) => r.active !== false);

  const doc = new PDFDocument({ size: "A4", margin: 0, info: {
    Title: `Vet Report — ${pet.name}`,
    Author: "PawTrack",
    Subject: `Health summary for ${pet.name} — last ${days} days`,
  }});

  doc.pipe(outStream);

  // ════════════════════════════════════════════════════════════
  // COVER BAND
  // ════════════════════════════════════════════════════════════
  doc.rect(0, 0, PW, 110).fill(BRAND);

  doc.font("Helvetica-Bold").fontSize(16).fillColor(WHITE)
     .text("Paw", ML, 28, { continued: true })
     .font("Helvetica").fillColor("rgba(255,255,255,0.55)")
     .text("Track");

  doc.font("Helvetica").fontSize(8.5).fillColor("rgba(255,255,255,0.5)")
     .text("Veterinary Health Report", ML, 48);

  doc.font("Helvetica-Bold").fontSize(28).fillColor(WHITE)
     .text(pet.name, ML, 62);

  let y = 130;

  // Pet details + period
  const petMeta = [
    pet.species && capitalize(pet.species),
    pet.breed   && capitalize(pet.breed),
    pet.age != null && `${pet.age} yr`,
    weights.length && `${weights[weights.length - 1].details?.weightKg} ${weights[weights.length - 1].details?.unit ?? "kg"}`,
  ].filter(Boolean).join("  ·  ");

  doc.font("Helvetica").fontSize(10).fillColor(GRAY).text(petMeta, ML, y);
  y += 14;
  doc.font("Helvetica").fontSize(8.5).fillColor(GRAY)
     .text(`Report period: ${fmt(from)} — ${fmt(new Date())}  (last ${days} days)`, ML, y)
     .text(`Generated: ${fmt(new Date())} ${fmtTime(new Date())}`, PW - MR - 170, y, { width: 170, align: "right" });

  y += 20;
  drawHRule(doc, y);
  y += 12;

  // Summary stat row
  const statDefs = [
    { v: events.length,     l: "Total events"  },
    { v: meals.length,      l: "Meals"         },
    { v: meds.length,       l: "Med doses"     },
    { v: activities.length, l: "Activities"    },
    { v: weights.length,    l: "Weight logs"   },
  ];
  const tileW = CW / statDefs.length;
  statDefs.forEach(({ v, l }, i) => {
    statTile(doc, ML + i * tileW, y, tileW - 3, 36, v, l);
  });

  y += 48;
  drawHRule(doc, y);
  y += 14;

  // ════════════════════════════════════════════════════════════
  // NUTRITION SUMMARY
  // ════════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Nutrition", y);

  if (meals.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text("No meals logged.", ML + 10, y);
    y += 18;
  } else {
    // Unique days with at least one meal
    const mealDays = new Set(meals.map((m) => new Date(m.occurredAt).toDateString())).size;
    const avgPerDay = (meals.length / days).toFixed(1);

    // Appetite counts
    const appetite = { all: 0, partial: 0, refused: 0, other: 0 };
    meals.forEach((m) => {
      const f = (m.details?.finished ?? "").toLowerCase();
      if (f === "all")           appetite.all++;
      else if (f === "partial")  appetite.partial++;
      else if (f === "refused")  appetite.refused++;
      else                       appetite.other++;
    });

    // Top foods
    const foodCount = {};
    meals.forEach((m) => {
      const f = capitalize(m.details?.food ?? "");
      if (f) foodCount[f] = (foodCount[f] ?? 0) + 1;
    });
    const topFoods = Object.entries(foodCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, n]) => `${name} (${n}×)`);

    // Left col: stat tiles
    const colL = ML;
    const colR = ML + CW / 2 + 10;
    const halfW = CW / 2 - 10;

    // Tiles
    const tW = (halfW - 4) / 3;
    statTile(doc, colL,          y, tW, 36, meals.length,              "total meals",     BRAND);
    statTile(doc, colL + tW + 2, y, tW, 36, mealDays,                  "days logged",     BRAND);
    statTile(doc, colL + tW * 2 + 4, y, tW, 36, avgPerDay,             "avg / day",       BRAND);

    // Right col: appetite breakdown
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BLACK)
       .text("Appetite breakdown", colR, y);
    let ay = y + 12;
    ay = progressBar(doc, colR, ay, halfW, "finished all", appetite.all,     meals.length, GREEN);
    ay = progressBar(doc, colR, ay, halfW, "partial",      appetite.partial,  meals.length, AMBER);
    ay = progressBar(doc, colR, ay, halfW, "refused",      appetite.refused,  meals.length, RED);

    y += 38;

    // Top foods row
    if (topFoods.length > 0) {
      doc.font("Helvetica").fontSize(8).fillColor(GRAY)
         .text("Top foods: ", ML + 2, y, { continued: true })
         .font("Helvetica-Bold").fillColor(BLACK)
         .text(topFoods.join("   ·   "));
      y += 14;
    }
  }

  y += 4;
  y = checkPage(doc, y, 80);

  // ════════════════════════════════════════════════════════════
  // MEDICATIONS
  // ════════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Medications & Prescriptions", y);

  if (activeRx.length === 0 && meds.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text("No medications recorded.", ML + 10, y);
    y += 18;
  } else {
    // Active prescriptions
    if (activeRx.length > 0) {
      activeRx.forEach((rx) => {
        y = checkPage(doc, y, 36);
        doc.rect(ML, y, CW, 30).fill(LIGHT);

        // Compliance: count logged doses for this rx
        const expectedDoses = Math.round(days / (rx.intervalHours / 24));
        const loggedDoses   = meds.filter((e) =>
          (e.details?.name ?? e.details?.medicationName ?? "").toLowerCase() === rx.medicationName.toLowerCase()
        ).length;
        const compliance = expectedDoses > 0
          ? `${loggedDoses}/${expectedDoses} doses logged`
          : `${loggedDoses} doses logged`;
        const compliancePct = expectedDoses > 0 ? Math.round((loggedDoses / expectedDoses) * 100) : null;
        const compColor = compliancePct == null ? GRAY : compliancePct >= 80 ? GREEN : compliancePct >= 50 ? AMBER : RED;

        doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK)
           .text(rx.medicationName, ML + 10, y + 5);

        const detail = [
          rx.dose != null ? `${rx.dose}${rx.doseUnit ? " " + rx.doseUnit : ""}` : null,
          intervalLabel(rx.intervalHours),
          rx.startDate ? `from ${fmtShort(rx.startDate)}` : null,
          rx.endDate   ? `until ${fmtShort(rx.endDate)}`  : null,
          rx.notes || null,
        ].filter(Boolean).join("  ·  ");

        doc.font("Helvetica").fontSize(7.5).fillColor(GRAY).text(detail, ML + 10, y + 17);

        // Compliance badge
        doc.font("Helvetica-Bold").fontSize(8).fillColor(compColor)
           .text(compliance, PW - MR - 120, y + 10, { width: 110, align: "right" });

        y += 34;
      });
    }

    // Other medications not tied to a prescription
    const otherMeds = meds.filter((e) => {
      const name = (e.details?.name ?? e.details?.medicationName ?? "").toLowerCase();
      return !activeRx.some((rx) => rx.medicationName.toLowerCase() === name);
    });

    if (otherMeds.length > 0) {
      y += 2;
      const otherNames = {};
      otherMeds.forEach((e) => {
        const n = capitalize(e.details?.name ?? e.details?.medicationName ?? "Medication");
        otherNames[n] = (otherNames[n] ?? 0) + 1;
      });
      doc.font("Helvetica").fontSize(8).fillColor(GRAY)
         .text("Other doses: ", ML + 2, y, { continued: true })
         .font("Helvetica-Bold").fillColor(BLACK)
         .text(Object.entries(otherNames).map(([k, v]) => `${k} (${v}×)`).join("   ·   "));
      y += 14;
    }
  }

  y += 4;
  y = checkPage(doc, y, 80);

  // ════════════════════════════════════════════════════════════
  // WEIGHT
  // ════════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Weight", y);

  if (weights.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text("No weight measurements logged.", ML + 10, y);
    y += 18;
  } else {
    // Mini stat tiles
    const wFirst = weights[0].details?.weightKg;
    const wLast  = weights[weights.length - 1].details?.weightKg;
    const wMin   = Math.min(...weights.map((w) => w.details?.weightKg ?? Infinity));
    const wMax   = Math.max(...weights.map((w) => w.details?.weightKg ?? -Infinity));
    const unit   = weights[0].details?.unit ?? "kg";
    const delta  = wFirst != null && wLast != null ? (wLast - wFirst).toFixed(2) : null;
    const deltaColor = delta == null ? GRAY : parseFloat(delta) === 0 ? GRAY : parseFloat(delta) > 0 ? AMBER : GREEN;

    const wTileW = (CW - 6) / 4;
    statTile(doc, ML,               y, wTileW, 36, `${wLast ?? "—"} ${unit}`,  "current",    BRAND);
    statTile(doc, ML + wTileW + 2,  y, wTileW, 36, `${wMin} ${unit}`,           "min",         GRAY);
    statTile(doc, ML + wTileW * 2 + 4, y, wTileW, 36, `${wMax} ${unit}`,        "max",         GRAY);
    statTile(doc, ML + wTileW * 3 + 6, y, wTileW, 36,
      delta != null ? `${parseFloat(delta) > 0 ? "+" : ""}${delta} ${unit}` : "—",
      "net change", deltaColor);

    y += 38 + 4;

    // Table of measurements (kept — medically important)
    const cols = [
      { label: "Date",    w: 140 },
      { label: "Weight",  w: 90  },
      { label: "Change",  w: 80  },
      { label: "Notes",   w: CW - 140 - 90 - 80 },
    ];

    // Header
    doc.rect(ML, y, CW, 14).fill(DIVIDER);
    let hx = ML;
    cols.forEach(({ label, w }) => {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BLACK)
         .text(label, hx + 4, y + 3, { width: w - 8, lineBreak: false });
      hx += w;
    });
    y += 14;

    weights.forEach((ev, i) => {
      y = checkPage(doc, y, 16);
      const prev  = weights[i - 1];
      const kg    = ev.details?.weightKg;
      const u     = ev.details?.unit ?? "kg";
      const d     = prev?.details?.weightKg != null && kg != null
        ? (kg - prev.details.weightKg).toFixed(2) : null;
      if (i % 2 === 0) doc.rect(ML, y, CW, 14).fill(LIGHT);
      const row = [
        fmt(ev.occurredAt),
        kg != null ? `${kg} ${u}` : "—",
        d != null ? `${parseFloat(d) > 0 ? "+" : ""}${d} ${u}` : "—",
        ev.notes ?? "",
      ];
      let rx = ML;
      row.forEach((text, ci) => {
        doc.font("Helvetica").fontSize(8).fillColor(GRAY)
           .text(text, rx + 4, y + 3, { width: cols[ci].w - 8, lineBreak: false, ellipsis: true });
        rx += cols[ci].w;
      });
      y += 14;
    });
  }

  y += 6;
  y = checkPage(doc, y, 80);

  // ════════════════════════════════════════════════════════════
  // ACTIVITY SUMMARY
  // ════════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Activity", y);

  if (activities.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text("No activity logged.", ML + 10, y);
    y += 18;
  } else {
    const totalMins  = activities.reduce((sum, e) => sum + (e.details?.duration ?? 0), 0);
    const avgMins    = activities.length > 0 ? Math.round(totalMins / activities.length) : 0;
    const activeDays = new Set(activities.map((e) => new Date(e.occurredAt).toDateString())).size;

    const aTileW = (CW - 6) / 4;
    statTile(doc, ML,                y, aTileW, 36, activities.length,     "sessions",      BRAND);
    statTile(doc, ML + aTileW + 2,   y, aTileW, 36, `${totalMins} min`,   "total time",    BRAND);
    statTile(doc, ML + aTileW * 2 + 4, y, aTileW, 36, `${avgMins} min`,   "avg duration",  GRAY);
    statTile(doc, ML + aTileW * 3 + 6, y, aTileW, 36, activeDays,         "active days",   GRAY);

    y += 38 + 4;

    // Activity type breakdown
    const typeCount = {};
    activities.forEach((e) => {
      const t = capitalize(e.details?.name ?? "Other");
      typeCount[t] = (typeCount[t] ?? 0) + 1;
    });
    const sorted = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BLACK).text("By activity type", ML + 2, y);
    y += 12;
    sorted.forEach(([name, count]) => {
      y = checkPage(doc, y, 18);
      y = progressBar(doc, ML, y, CW, name, count, activities.length, BRAND);
    });
  }

  y += 6;
  y = checkPage(doc, y, 60);

  // ════════════════════════════════════════════════════════════
  // OTHER EVENTS
  // ════════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Bathroom & Other", y);

  // Stat tiles
  const oTileW = (CW - 4) / 3;
  statTile(doc, ML,              y, oTileW, 36, poops.length,   "poop events",  GRAY);
  statTile(doc, ML + oTileW + 2, y, oTileW, 36, litters.length, "litter cleans", GRAY);
  statTile(doc, ML + oTileW * 2 + 4, y, oTileW, 36, treats.length, "treat events", GRAY);

  y += 38 + 4;

  if (poops.length > 0) {
    const consist = {};
    poops.forEach((p) => {
      const c = capitalize(p.details?.consistency ?? "unspecified");
      consist[c] = (consist[c] ?? 0) + 1;
    });
    const sorted = Object.entries(consist).sort((a, b) => b[1] - a[1]);

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BLACK).text("Stool consistency", ML + 2, y);
    y += 12;
    sorted.forEach(([name, count]) => {
      y = checkPage(doc, y, 18);
      const color = name === "Normal" ? GREEN : name === "Soft" ? AMBER : name === "Firm" ? BRAND : GRAY;
      y = progressBar(doc, ML, y, CW, name, count, poops.length, color);
    });
  }

  // ════════════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════════════
  const footerY = PH - 32;
  drawHRule(doc, footerY - 8);
  doc.font("Helvetica").fontSize(7).fillColor(GRAY)
     .text(
       `Generated by PawTrack · ${fmt(new Date())} · This report is a summary of logged events and does not constitute veterinary advice.`,
       ML, footerY, { width: CW, align: "center" }
     );

  doc.end();
}
