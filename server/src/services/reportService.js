/**
 * reportService.js — Clinical veterinary report.
 *
 * Priority order: patient info → alerts → medications → weight →
 * appetite → bathroom → activity (compact).
 * Goal: one A4 page a vet can scan in under a minute.
 */

import PDFDocument from "pdfkit";
import Event from "../models/Event.js";
import Prescription from "../models/Prescription.js";
import Vaccine from "../models/Vaccine.js";

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
const LIGHT_RED   = "#FEF2F2";
const LIGHT_AMBER = "#FFFBEB";
const LIGHT_GREEN = "#F0FDF4";

// ── Layout ────────────────────────────────────────────────────────────────
const PW = 595.28;
const PH = 841.89;
const ML = 48;
const MR = 48;
const CW = PW - ML - MR;

// ── Formatters ────────────────────────────────────────────────────────────
function fmt(date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function fmtShort(date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtTime(date) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}
function pct(n, total) {
  return total ? `${Math.round((n / total) * 100)}%` : "0%";
}

/** Convert intervalHours to clinical notation. */
function clinicalFreq(h) {
  if (h <= 6)  return "QID (4×/day)";
  if (h <= 10) return "TID (3×/day)";
  if (h <= 14) return "BID (twice daily)";
  if (h <= 26) return "SID (once daily)";
  if (h <= 50) return "Every 2 days";
  if (h <= 98) return "Every 3 days";
  return `Every ${Math.round(h / 24)} days`;
}

/** One-sentence weight trend descriptor. */
function weightTrend(first, last) {
  if (first == null || last == null) return null;
  const delta = last - first;
  const pctChange = Math.abs(delta / first) * 100;
  if (pctChange < 1)  return "Weight stable over this period.";
  const dir = delta > 0 ? "gain" : "loss";
  if (pctChange < 5)  return `Mild weight ${dir} over this period (${pctChange.toFixed(1)}%).`;
  if (pctChange < 10) return `Moderate weight ${dir} over this period (${pctChange.toFixed(1)}%) — recommend monitoring.`;
  return `Significant weight ${dir} over this period (${pctChange.toFixed(1)}%) — veterinary attention advised.`;
}

// ── Drawing primitives ────────────────────────────────────────────────────
function drawHRule(doc, y, color = DIVIDER) {
  doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor(color).lineWidth(0.5).stroke();
}

function sectionHeader(doc, title, y) {
  doc.rect(ML, y, CW, 18).fill(LIGHT);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BRAND)
     .text(title.toUpperCase(), ML + 10, y + 5, { characterSpacing: 0.6 });
  return y + 18 + 6;
}

function checkPage(doc, y, needed = 40) {
  if (y + needed > PH - 48) {
    doc.addPage();
    return 48;
  }
  return y;
}

function statTile(doc, x, y, w, h, value, label, color = BRAND) {
  doc.rect(x, y, w, h).fill(LIGHT);
  doc.font("Helvetica-Bold").fontSize(15).fillColor(color)
     .text(String(value), x, y + 5, { width: w, align: "center" });
  doc.font("Helvetica").fontSize(6.5).fillColor(GRAY)
     .text(label, x, y + 23, { width: w, align: "center" });
}

function progressBar(doc, x, y, w, label, value, total, color = BRAND) {
  const barW = w - 110;
  const filled = total > 0 ? Math.round((value / total) * barW) : 0;

  doc.font("Helvetica").fontSize(8).fillColor(GRAY)
     .text(capitalize(label), x, y + 1, { width: 70 });
  doc.rect(x + 75, y + 3, barW, 6).fill(DIVIDER);
  if (filled > 0) doc.rect(x + 75, y + 3, filled, 6).fill(color);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLACK)
     .text(`${value}  `, x + 75 + barW + 6, y + 1, { continued: true })
     .font("Helvetica").fillColor(GRAY).text(pct(value, total));

  return y + 13;
}

/**
 * Stacked appetite bar — green (all) | amber (partial) | red (refused).
 * Returns new y.
 */
function appetiteBar(doc, x, y, w, all, partial, refused, total) {
  const h = 10;
  let cx = x;
  for (const [n, color] of [[all, GREEN], [partial, AMBER], [refused, RED]]) {
    if (n > 0 && total > 0) {
      const sw = Math.max(Math.round((n / total) * w), 1);
      doc.rect(cx, y, sw, h).fill(color);
      cx += sw;
    }
  }
  // Fill any rounding gap
  if (cx < x + w) doc.rect(cx, y, x + w - cx, h).fill(DIVIDER);

  y += h + 5;
  // Legend
  const items = [
    { label: "Finished all", n: all,     color: GREEN },
    { label: "Partial",      n: partial,  color: AMBER },
    { label: "Refused",      n: refused,  color: RED   },
  ];
  let lx = x;
  items.forEach(({ label, n, color }) => {
    doc.rect(lx, y + 1, 7, 7).fill(color);
    doc.font("Helvetica").fontSize(7.5).fillColor(GRAY)
       .text(`${label}: ${n} (${pct(n, total)})`, lx + 10, y, { width: 120 });
    lx += 135;
  });
  return y + 13;
}

/** Single alert row with colored left stripe and tinted background. */
function alertRow(doc, x, y, w, text, level) {
  const colors  = { critical: RED, notable: AMBER, ok: GREEN };
  const bgColors = { critical: LIGHT_RED, notable: LIGHT_AMBER, ok: LIGHT_GREEN };
  const icons    = { critical: "▲", notable: "●", ok: "✓" };

  const color = colors[level]   || GRAY;
  const bg    = bgColors[level] || LIGHT;
  const icon  = icons[level]    || "●";

  doc.rect(x, y, w, 17).fill(bg);
  doc.rect(x, y, 3, 17).fill(color);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(color)
     .text(icon, x + 7, y + 5, { width: 10 });
  doc.font("Helvetica").fontSize(8).fillColor(level === "ok" ? GRAY : BLACK)
     .text(text, x + 20, y + 5, { width: w - 24, lineBreak: false, ellipsis: true });

  return y + 19;
}

// ── Alert computation ─────────────────────────────────────────────────────
function computeAlerts({ weights, meals, poops, activeRx, meds, vaccines, days }) {
  const alerts = [];

  // Weight change
  if (weights.length >= 2) {
    const first = weights[0].details?.weightKg;
    const last  = weights[weights.length - 1].details?.weightKg;
    if (first != null && last != null) {
      const delta    = last - first;
      const pctChange = Math.abs(delta / first) * 100;
      const dir      = delta < 0 ? "down" : "up";
      const sign     = delta < 0 ? "−" : "+";
      if (pctChange >= 10) {
        alerts.push({ level: "critical", text: `Weight ${dir} ${Math.abs(delta).toFixed(2)} kg over period (${pctChange.toFixed(1)}% change) — significant` });
      } else if (pctChange >= 3) {
        alerts.push({ level: "notable", text: `Weight ${dir} ${Math.abs(delta).toFixed(2)} kg over period (${pctChange.toFixed(1)}%)` });
      }
    }
  }

  // Appetite
  if (meals.length > 0) {
    const refused = meals.filter((m) => (m.details?.finished ?? "").toLowerCase() === "refused").length;
    if (refused > 0) {
      const p = Math.round((refused / meals.length) * 100);
      alerts.push({
        level: p >= 25 ? "critical" : "notable",
        text: `${refused} refused meal${refused > 1 ? "s" : ""} (${p}% of ${meals.length} logged)`,
      });
    }
  }

  // Stool
  if (poops.length > 0) {
    const abnormal = poops.filter((p) =>
      ["soft", "diarrhea", "liquid", "loose"].includes((p.details?.consistency ?? "").toLowerCase())
    ).length;
    if (abnormal > 0) {
      const p = Math.round((abnormal / poops.length) * 100);
      alerts.push({
        level: abnormal >= 5 ? "critical" : "notable",
        text: `${abnormal} soft/loose stool event${abnormal > 1 ? "s" : ""} out of ${poops.length} (${p}%)`,
      });
    }
  }

  // Medication compliance
  for (const rx of activeRx) {
    const expected = Math.round(days / (rx.intervalHours / 24));
    const logged   = meds.filter((e) =>
      (e.details?.name ?? e.details?.medicationName ?? "").toLowerCase() === rx.medicationName.toLowerCase()
    ).length;
    if (expected > 0) {
      const p = Math.round((logged / expected) * 100);
      if (p < 80) {
        alerts.push({
          level: p < 50 ? "critical" : "notable",
          text: `${rx.medicationName}: ${logged}/${expected} doses logged (${p}% compliance)`,
        });
      } else {
        alerts.push({
          level: "ok",
          text: `${rx.medicationName}: ${logged}/${expected} doses logged (${p}% compliance)`,
        });
      }
    }
  }

  // Vaccines
  const now = Date.now();
  for (const v of vaccines) {
    if (!v.nextDue) continue;
    const daysUntil = Math.ceil((new Date(v.nextDue) - now) / 86400000);
    if (daysUntil < 0) {
      alerts.push({ level: "critical", text: `${v.name} vaccine overdue (was due ${fmt(v.nextDue)})` });
    } else if (daysUntil <= 30) {
      alerts.push({ level: "notable", text: `${v.name} vaccine due soon (${fmt(v.nextDue)})` });
    }
  }

  // All clear
  if (alerts.length === 0) {
    alerts.push({ level: "ok", text: "No significant concerns detected in this period." });
  }

  // Sort: critical → notable → ok
  const order = { critical: 0, notable: 1, ok: 2 };
  alerts.sort((a, b) => order[a.level] - order[b.level]);

  return alerts;
}

// ── Clinical summary sentence ─────────────────────────────────────────────
function buildSummary({ days, weights, meals, poops, activeRx, meds }) {
  const parts = [];

  // Weight
  if (weights.length > 0) {
    const last  = weights[weights.length - 1];
    const kg    = last.details?.weightKg;
    const unit  = last.details?.unit ?? "kg";
    if (kg != null) {
      let s = `${kg} ${unit} current weight`;
      if (weights.length >= 2) {
        const first = weights[0].details?.weightKg;
        if (first != null) {
          const delta = kg - first;
          s += ` (${delta < 0 ? "−" : "+"}${Math.abs(delta).toFixed(2)} ${unit} net)`;
        }
      }
      parts.push(s);
    }
  }

  // Meals
  if (meals.length > 0) {
    const refused = meals.filter((m) => (m.details?.finished ?? "").toLowerCase() === "refused").length;
    parts.push(
      `${meals.length} meals logged` +
      (refused > 0 ? ` with ${refused} refused (${Math.round(refused / meals.length * 100)}%)` : "")
    );
  }

  // Stool
  if (poops.length > 0) {
    const abnormal = poops.filter((p) =>
      ["soft", "diarrhea", "liquid", "loose"].includes((p.details?.consistency ?? "").toLowerCase())
    ).length;
    parts.push(
      `${poops.length} stool event${poops.length > 1 ? "s" : ""}` +
      (abnormal > 0 ? ` with ${abnormal} soft/loose` : "")
    );
  }

  // Meds
  for (const rx of activeRx) {
    const expected = Math.round(days / (rx.intervalHours / 24));
    const logged   = meds.filter((e) =>
      (e.details?.name ?? e.details?.medicationName ?? "").toLowerCase() === rx.medicationName.toLowerCase()
    ).length;
    if (expected > 0) {
      const p = Math.round((logged / expected) * 100);
      parts.push(`${rx.medicationName} ${logged}/${expected} doses (~${p}% compliance)`);
    }
  }

  if (parts.length === 0) return null;
  return `Past ${days} days: ${parts.join(";  ")}.`;
}

// ── Main export ───────────────────────────────────────────────────────────
export async function generateVetReport(pet, days, concern, outStream) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const [events, prescriptions, vaccines] = await Promise.all([
    Event.find({ petId: pet._id, occurredAt: { $gte: from } }).sort({ occurredAt: 1 }),
    Prescription.find({ petId: pet._id }),
    Vaccine.find({ petId: pet._id }),
  ]);

  const meals      = events.filter((e) => e.type === "meal");
  const meds       = events.filter((e) => e.type === "medication");
  const activities = events.filter((e) => e.type === "activity");
  const weights    = events.filter((e) => e.type === "weight" && e.details?.weightKg != null);
  const poops      = events.filter((e) => e.type === "poop");
  const litters    = events.filter((e) => e.type === "litter");
  const activeRx   = prescriptions.filter((r) => r.active !== false);

  const latestWeight  = weights.length ? weights[weights.length - 1] : null;
  const currentWt     = latestWeight?.details?.weightKg;
  const currentWtUnit = latestWeight?.details?.unit ?? "kg";

  const alerts = computeAlerts({ weights, meals, poops, activeRx, meds, vaccines, days });
  const summary = buildSummary({ days, weights, meals, poops, activeRx, meds });

  const doc = new PDFDocument({ size: "A4", margin: 0, info: {
    Title:   `Vet Report — ${pet.name}`,
    Author:  "PawTrack",
    Subject: `Clinical summary for ${pet.name} — last ${days} days`,
  }});

  doc.pipe(outStream);

  // ═════════════════════════════════════════════════════════
  // HEADER BAND
  // ═════════════════════════════════════════════════════════
  doc.rect(0, 0, PW, 80).fill(BRAND);

  // Logo
  doc.font("Helvetica-Bold").fontSize(13).fillColor(WHITE)
     .text("Paw", ML, 18, { continued: true })
     .font("Helvetica").fillColor("rgba(255,255,255,0.5)").text("Track");

  doc.font("Helvetica").fontSize(7.5).fillColor("rgba(255,255,255,0.45)")
     .text("Veterinary Health Report", ML, 35);

  // Generated timestamp (right-aligned in band)
  doc.font("Helvetica").fontSize(7.5).fillColor("rgba(255,255,255,0.45)")
     .text(`Generated: ${fmt(new Date())} ${fmtTime(new Date())}`, 0, 18, {
       width: PW - MR, align: "right",
     });

  // Report period (right-aligned, below timestamp)
  doc.font("Helvetica").fontSize(7.5).fillColor("rgba(255,255,255,0.45)")
     .text(`Period: ${fmt(from)} – ${fmt(new Date())}  (${days} days)`, 0, 35, {
       width: PW - MR, align: "right",
     });

  let y = 90;

  // ═════════════════════════════════════════════════════════
  // PATIENT INFO
  // ═════════════════════════════════════════════════════════
  // Pet name (large)
  doc.font("Helvetica-Bold").fontSize(20).fillColor(BLACK).text(pet.name, ML, y);

  // Species · breed · age on the same line, right column
  const meta = [
    pet.species && capitalize(pet.species),
    pet.breed   && capitalize(pet.breed),
    pet.age != null && `${pet.age} yr`,
  ].filter(Boolean).join("  ·  ");

  doc.font("Helvetica").fontSize(9).fillColor(GRAY)
     .text(meta, ML + 150, y + 6, { width: CW - 150, align: "right" });

  y += 24;

  // Current weight + period
  if (currentWt != null) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND)
       .text(`Current weight: ${currentWt} ${currentWtUnit}`, ML, y);
  }

  y += 14;

  // Reason for visit
  if (concern) {
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(BLACK)
       .text(`Owner concern: "${concern}"`, ML, y, { width: CW });
    y += 15;
  }

  // Clinical summary sentence
  if (summary) {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(GRAY)
       .text(summary, ML, y, { width: CW });
    y += 18;
  }

  drawHRule(doc, y);
  y += 10;

  // ═════════════════════════════════════════════════════════
  // CLINICAL ALERTS
  // ═════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Clinical Alerts", y);

  for (const alert of alerts) {
    y = checkPage(doc, y, 20);
    y = alertRow(doc, ML, y, CW, alert.text, alert.level);
    y += 2;
  }

  y += 6;
  drawHRule(doc, y);
  y += 10;

  // ═════════════════════════════════════════════════════════
  // MEDICATIONS & PRESCRIPTIONS
  // ═════════════════════════════════════════════════════════
  y = checkPage(doc, y, 60);
  y = sectionHeader(doc, "Medications & Prescriptions", y);

  if (activeRx.length === 0 && meds.length === 0) {
    doc.font("Helvetica").fontSize(8.5).fillColor(GRAY).text("No medications recorded.", ML + 8, y);
    y += 16;
  } else {
    if (activeRx.length > 0) {
      for (const rx of activeRx) {
        y = checkPage(doc, y, 38);
        doc.rect(ML, y, CW, 32).fill(LIGHT);

        const expected   = Math.round(days / (rx.intervalHours / 24));
        const logged     = meds.filter((e) =>
          (e.details?.name ?? e.details?.medicationName ?? "").toLowerCase() === rx.medicationName.toLowerCase()
        ).length;
        const compliancePct  = expected > 0 ? Math.round((logged / expected) * 100) : null;
        const compColor  = compliancePct == null ? GRAY
          : compliancePct >= 80 ? GREEN
          : compliancePct >= 50 ? AMBER : RED;
        const compText   = compliancePct != null
          ? `${logged}/${expected} doses  ·  ${compliancePct}% compliance`
          : `${logged} doses logged`;

        // Last dose
        const lastDoseEv = [...meds]
          .filter((e) => (e.details?.name ?? e.details?.medicationName ?? "").toLowerCase() === rx.medicationName.toLowerCase())
          .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))[0];
        const lastDose = lastDoseEv ? `Last dose: ${fmt(lastDoseEv.occurredAt)} ${fmtTime(lastDoseEv.occurredAt)}` : "No doses logged in period";

        // Line 1: name + compliance badge (right)
        doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK)
           .text(rx.medicationName, ML + 8, y + 5);

        doc.font("Helvetica-Bold").fontSize(8).fillColor(compColor)
           .text(compText, 0, y + 5, { width: PW - MR - 8, align: "right" });

        // Line 2: dose · schedule · dates
        const doseStr = [
          rx.dose != null ? `${rx.dose}${rx.doseUnit ? " " + rx.doseUnit : ""}` : null,
          clinicalFreq(rx.intervalHours),
          rx.startDate ? `from ${fmt(rx.startDate)}` : null,
          rx.endDate   ? `until ${fmt(rx.endDate)}`  : null,
          rx.notes     || null,
        ].filter(Boolean).join("  ·  ");

        doc.font("Helvetica").fontSize(7.5).fillColor(GRAY)
           .text(doseStr, ML + 8, y + 18, { width: CW * 0.6 });

        doc.font("Helvetica").fontSize(7.5).fillColor(GRAY)
           .text(lastDose, 0, y + 18, { width: PW - MR - 8, align: "right" });

        y += 36;
      }
    }

    // Ad-hoc meds (not tied to a prescription)
    const otherMeds = meds.filter((e) => {
      const n = (e.details?.name ?? e.details?.medicationName ?? "").toLowerCase();
      return !activeRx.some((rx) => rx.medicationName.toLowerCase() === n);
    });

    if (otherMeds.length > 0) {
      y += 2;
      const counts = {};
      otherMeds.forEach((e) => {
        const n = capitalize(e.details?.name ?? e.details?.medicationName ?? "Medication");
        counts[n] = (counts[n] ?? 0) + 1;
      });
      doc.font("Helvetica").fontSize(8).fillColor(GRAY)
         .text("Other doses logged: ", ML + 4, y, { continued: true })
         .font("Helvetica-Bold").fillColor(BLACK)
         .text(Object.entries(counts).map(([k, v]) => `${k} (${v}×)`).join("  ·  "));
      y += 14;
    }
  }

  y += 6;
  y = checkPage(doc, y, 80);

  // ═════════════════════════════════════════════════════════
  // WEIGHT
  // ═════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Weight", y);

  if (weights.length === 0) {
    doc.font("Helvetica").fontSize(8.5).fillColor(GRAY).text("No weight measurements logged.", ML + 8, y);
    y += 16;
  } else {
    const wFirst   = weights[0].details?.weightKg;
    const wLast    = weights[weights.length - 1].details?.weightKg;
    const wMin     = Math.min(...weights.map((w) => w.details.weightKg));
    const wMax     = Math.max(...weights.map((w) => w.details.weightKg));
    const unit     = weights[0].details?.unit ?? "kg";
    const delta    = wFirst != null && wLast != null ? wLast - wFirst : null;
    const deltaStr = delta != null
      ? `${delta < 0 ? "−" : "+"}${Math.abs(delta).toFixed(2)} ${unit}`
      : "—";
    const deltaColor = delta == null ? GRAY : Math.abs(delta) < 0.05 ? GRAY : delta < 0 ? AMBER : GREEN;

    // Stat tiles
    const tW = (CW - 6) / 4;
    statTile(doc, ML,               y, tW, 34, `${wLast ?? "—"} ${unit}`, "current",    BRAND);
    statTile(doc, ML + tW + 2,      y, tW, 34, `${wMin} ${unit}`,         "min",        GRAY);
    statTile(doc, ML + tW * 2 + 4,  y, tW, 34, `${wMax} ${unit}`,         "max",        GRAY);
    statTile(doc, ML + tW * 3 + 6,  y, tW, 34, deltaStr,                  "net change", deltaColor);
    y += 38;

    // Trend descriptor
    const trend = weightTrend(wFirst, wLast);
    if (trend) {
      doc.font("Helvetica-Oblique").fontSize(7.5).fillColor(deltaColor === GRAY ? GRAY : deltaColor)
         .text(trend, ML + 4, y);
      y += 13;
    }

    // Weight table (capped at 6 most recent entries)
    const tableWeights = weights.slice(-6);
    const cols = [
      { label: "Date",         w: 130 },
      { label: "Weight",       w: 80  },
      { label: "Change",       w: 80  },
      { label: "Notes",        w: CW - 130 - 80 - 80 },
    ];

    y = checkPage(doc, y, 18 + tableWeights.length * 14);

    // Table header
    doc.rect(ML, y, CW, 14).fill(DIVIDER);
    let hx = ML;
    cols.forEach(({ label, w }) => {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(BLACK)
         .text(label, hx + 4, y + 3, { width: w - 8, lineBreak: false });
      hx += w;
    });
    y += 14;

    tableWeights.forEach((ev, i) => {
      y = checkPage(doc, y, 14);
      const prev  = tableWeights[i - 1];
      const kg    = ev.details?.weightKg;
      const u     = ev.details?.unit ?? "kg";
      const d     = prev?.details?.weightKg != null && kg != null
        ? kg - prev.details.weightKg : null;
      if (i % 2 === 0) doc.rect(ML, y, CW, 14).fill(LIGHT);
      const row = [
        fmt(ev.occurredAt),
        kg != null ? `${kg} ${u}` : "—",
        d  != null ? `${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(2)} ${u}` : "—",
        ev.notes ?? "",
      ];
      let rx = ML;
      row.forEach((text, ci) => {
        doc.font("Helvetica").fontSize(7.5).fillColor(GRAY)
           .text(text, rx + 4, y + 3, { width: cols[ci].w - 8, lineBreak: false, ellipsis: true });
        rx += cols[ci].w;
      });
      y += 14;
    });
  }

  y += 6;
  y = checkPage(doc, y, 70);

  // ═════════════════════════════════════════════════════════
  // APPETITE & NUTRITION
  // ═════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Appetite & Nutrition", y);

  if (meals.length === 0) {
    doc.font("Helvetica").fontSize(8.5).fillColor(GRAY).text("No meals logged.", ML + 8, y);
    y += 16;
  } else {
    const mealDays   = new Set(meals.map((m) => new Date(m.occurredAt).toDateString())).size;
    const avgPerDay  = (meals.length / days).toFixed(1);
    const allFinished = meals.filter((m) => (m.details?.finished ?? "").toLowerCase() === "all").length;
    const partial     = meals.filter((m) => (m.details?.finished ?? "").toLowerCase() === "partial").length;
    const refused     = meals.filter((m) => (m.details?.finished ?? "").toLowerCase() === "refused").length;

    // Stats line
    doc.font("Helvetica").fontSize(8).fillColor(BLACK)
       .text(
         `${meals.length} meals over ${days} days  ·  ${mealDays} days logged  ·  avg ${avgPerDay}/day`,
         ML + 4, y
       );
    y += 14;

    // Stacked appetite bar
    y = appetiteBar(doc, ML, y, CW, allFinished, partial, refused, meals.length);
    y += 4;
  }

  y += 6;
  y = checkPage(doc, y, 60);

  // ═════════════════════════════════════════════════════════
  // BATHROOM & STOOL
  // ═════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Bathroom & Stool", y);

  if (poops.length === 0 && litters.length === 0) {
    doc.font("Helvetica").fontSize(8.5).fillColor(GRAY).text("No bathroom events logged.", ML + 8, y);
    y += 16;
  } else {
    // Summary line
    const litStr = litters.length > 0 ? `  ·  ${litters.length} litter clean${litters.length > 1 ? "s" : ""}` : "";
    doc.font("Helvetica").fontSize(8).fillColor(BLACK)
       .text(`${poops.length} stool event${poops.length !== 1 ? "s" : ""}${litStr}`, ML + 4, y);
    y += 13;

    if (poops.length > 0) {
      const consist = {};
      poops.forEach((p) => {
        const c = capitalize(p.details?.consistency ?? "unspecified");
        consist[c] = (consist[c] ?? 0) + 1;
      });
      const sorted = Object.entries(consist).sort((a, b) => b[1] - a[1]);
      sorted.forEach(([name, count]) => {
        y = checkPage(doc, y, 16);
        const color = name === "Normal" ? GREEN
          : ["Soft", "Loose", "Diarrhea", "Liquid"].includes(name) ? AMBER
          : GRAY;
        y = progressBar(doc, ML, y, CW, name, count, poops.length, color);
      });
    }
  }

  y += 6;
  y = checkPage(doc, y, 40);

  // ═════════════════════════════════════════════════════════
  // ACTIVITY (compact — secondary)
  // ═════════════════════════════════════════════════════════
  y = sectionHeader(doc, "Activity", y);

  if (activities.length === 0) {
    doc.font("Helvetica").fontSize(8.5).fillColor(GRAY).text("No activity logged.", ML + 8, y);
    y += 14;
  } else {
    const totalMins  = activities.reduce((s, e) => s + (e.details?.duration ?? 0), 0);
    const avgMins    = Math.round(totalMins / activities.length);
    const activeDays = new Set(activities.map((e) => new Date(e.occurredAt).toDateString())).size;

    doc.font("Helvetica").fontSize(8).fillColor(BLACK)
       .text(
         `${activities.length} sessions  ·  ${totalMins} min total  ·  avg ${avgMins} min/session  ·  ${activeDays} active day${activeDays !== 1 ? "s" : ""} of ${days}`,
         ML + 4, y, { width: CW }
       );
    y += 14;
  }

  // ═════════════════════════════════════════════════════════
  // FOOTER
  // ═════════════════════════════════════════════════════════
  const footerY = PH - 28;
  drawHRule(doc, footerY - 8);
  doc.font("Helvetica").fontSize(6.5).fillColor(GRAY)
     .text(
       `Generated by PawTrack · ${fmt(new Date())} · This report summarises owner-logged events and does not constitute veterinary advice.`,
       ML, footerY, { width: CW, align: "center" }
     );

  doc.end();
}
