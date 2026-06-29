import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Info } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { getPets } from "../api/pets.js";
import { getEvents } from "../api/events.js";
import { getPrescriptions } from "../api/prescriptions.js";

// ── Design tokens ────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  meal:       "#b45309",
  medication: "#be123c",
  activity:   "#57534e",
  litter:     "#a8a29e",
  poop:       "#78350f",
  treats:     "#ea580c",
};

const TYPE_LABELS = {
  meal:       "Meal",
  medication: "Medication",
  activity:   "Activity",
  litter:     "Litter",
  poop:       "Poop",
  treats:     "Treats",
};

const EVENT_TYPES = Object.keys(TYPE_COLORS);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isSameLocalDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth()    === dateB.getMonth()    &&
    dateA.getDate()     === dateB.getDate()
  );
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

// Build array of 14 day objects for the stacked bar chart.
function buildBarData(events) {
  return Array.from({ length: 14 }, (_, i) => {
    const day = daysAgo(13 - i);
    const dayEvents = events.filter((ev) =>
      isSameLocalDay(new Date(ev.occurredAt), day)
    );
    const label = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const entry = { date: label };
    EVENT_TYPES.forEach((t) => {
      entry[t] = dayEvents.filter((ev) => ev.type === t).length;
    });
    return entry;
  });
}

// Build donut data — only include types with at least 1 event.
function buildDonutData(events) {
  return EVENT_TYPES
    .map((t) => ({
      name:  TYPE_LABELS[t],
      value: events.filter((ev) => ev.type === t).length,
      fill:  TYPE_COLORS[t],
    }))
    .filter((d) => d.value > 0);
}

// Count consecutive days (from today backwards) with at least one event.
function calcStreak(events) {
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const day = daysAgo(i);
    if (events.some((ev) => isSameLocalDay(new Date(ev.occurredAt), day))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function topType(events) {
  if (!events.length) return null;
  const counts = {};
  events.forEach((ev) => { counts[ev.type] = (counts[ev.type] ?? 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function intervalLabel(h) {
  if (h <= 13)  return "twice daily";
  if (h <= 25)  return "once daily";
  if (h <= 50)  return "every 2 days";
  if (h <= 98)  return "every 3 days";
  if (h <= 200) return "weekly";
  return `every ${Math.round(h / 24)} days`;
}

// ── Health alerts ─────────────────────────────────────────────────────────────
// Returns an array of { level: "warn"|"info", text: string }.
// events: last 30 days sorted descending.
// prescriptions: active prescriptions for this pet.
function buildAlerts(events, prescriptions = []) {
  if (!events.length && !prescriptions.length) return [];

  const alerts = [];
  const now = new Date();
  const hoursAgo = (date) => (now - date) / 3_600_000;
  const dSinceMs = (date) => (now - date) / 86_400_000;

  // ── Event-based checks (only run when there is history) ─────────────────
  if (events.length) {
    // Last occurrence of a given type (events are sorted desc by occurredAt)
    const lastOf = (type) => {
      const hit = events.find((ev) => ev.type === type);
      return hit ? new Date(hit.occurredAt) : null;
    };

    const countInWindow = (type, fromDate, toDate = now) =>
      events.filter((ev) => {
        const d = new Date(ev.occurredAt);
        return ev.type === type && d >= fromDate && d <= toDate;
      }).length;

    // 1. No events at all today
    const hasToday = events.some((ev) =>
      isSameLocalDay(new Date(ev.occurredAt), now)
    );
    if (!hasToday) {
      alerts.push({ level: "warn", text: "No events logged today — streak at risk." });
    }

    // 2. No meal in >24 h (only if meals exist in history)
    const lastMeal = lastOf("meal");
    if (lastMeal) {
      const h = hoursAgo(lastMeal);
      if (h > 24) {
        alerts.push({
          level: "warn",
          text: `No meal logged in ${Math.round(h)} hours.`,
        });
      }
    }

    // 3a. No poop in >2 days (only if poop was ever logged)
    const lastPoop = lastOf("poop");
    if (lastPoop) {
      const d = dSinceMs(lastPoop);
      if (d > 2) {
        alerts.push({
          level: "warn",
          text: `No poop logged in ${Math.floor(d)} days — could indicate a GI issue.`,
        });
      }
    }

    // 3b. Abnormal poop consistency for 2+ events in the last 3 days.
    const ABNORMAL = ["loose", "liquid", "solid"];
    const recentWeirdPoops = events.filter((ev) => {
      if (ev.type !== "poop") return false;
      return (
        new Date(ev.occurredAt) >= daysAgo(3) &&
        ABNORMAL.includes(ev.details?.consistency)
      );
    });
    if (recentWeirdPoops.length >= 2) {
      const counts = {};
      recentWeirdPoops.forEach((ev) => {
        const c = ev.details?.consistency;
        if (c) counts[c] = (counts[c] ?? 0) + 1;
      });
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const label = dominant === "solid" ? "very solid" : dominant;
      alerts.push({
        level: "warn",
        text: `Poop has been ${label} for the past few days — worth a vet check if it continues.`,
      });
    }

    // 5. Activity down >50% week-over-week (need ≥3 last week to avoid noise)
    const actThis = countInWindow("activity", daysAgo(6));
    const actPrev = countInWindow("activity", daysAgo(13), daysAgo(6));
    if (actPrev >= 3 && actThis < actPrev / 2) {
      alerts.push({
        level: "info",
        text: `Activity down this week: ${actThis} vs ${actPrev} last week.`,
      });
    }
  }

  // ── Prescription checks (always run — even if no events logged yet) ──────
  for (const rx of prescriptions) {
    const start = new Date(rx.startDate);
    const end   = rx.endDate ? new Date(rx.endDate) : null;

    // Skip if we're outside the prescribed window
    if (now < start) continue;
    if (end && now > end) continue;

    // Find most recent medication event whose name matches (case-insensitive)
    const rxName = rx.medicationName.toLowerCase();
    const lastLog = events.find(
      (ev) =>
        ev.type === "medication" &&
        (ev.details?.name ?? "").toLowerCase() === rxName &&
        new Date(ev.occurredAt) >= start
    );

    const sinceLastH = lastLog
      ? hoursAgo(new Date(lastLog.occurredAt))
      : hoursAgo(start); // use prescription start as baseline if never logged

    if (sinceLastH > rx.intervalHours * 1.5) {
      const overdueSince = lastLog
        ? `${Math.round(sinceLastH)}h ago`
        : "not logged yet";
      alerts.push({
        level: "warn",
        text: `${rx.medicationName} is overdue — prescribed ${intervalLabel(rx.intervalHours)}, last logged ${overdueSince}.`,
      });
    }
  }

  return alerts;
}

// ── Alerts panel ─────────────────────────────────────────────────────────────
function AlertsPanel({ alerts }) {
  if (!alerts.length) return null;
  return (
    <section className="mb-6 flex flex-col gap-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${
            a.level === "warn"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-stone-50 border-stone-200 text-stone-600"
          }`}
        >
          {a.level === "warn" ? (
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          ) : (
            <Info size={15} className="mt-0.5 shrink-0 text-stone-400" />
          )}
          <span>{a.text}</span>
        </div>
      ))}
    </section>
  );
}

// ── Custom tooltip for bar chart ─────────────────────────────────────────────
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  if (!total) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-stone-700 mb-1">{label}</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-stone-600">{TYPE_LABELS[p.dataKey]}: {p.value}</span>
        </div>
      ))}
      <p className="text-stone-400 mt-1 border-t border-stone-100 pt-1">Total: {total}</p>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`bg-stone-100 rounded-xl animate-pulse ${className}`} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Routine() {
  const navigate = useNavigate();

  const [pets, setPets]                     = useState([]);
  const [petsLoading, setPetsLoading]       = useState(true);
  const [selectedPetId, setSelectedPetId]   = useState(null);

  const [events, setEvents]                       = useState([]);
  const [eventsLoading, setEventsLoading]         = useState(false);
  const [prescriptions, setPrescriptions]         = useState([]);

  // Load pets once
  useEffect(() => {
    getPets()
      .then((data) => {
        setPets(data);
        if (data.length === 1) setSelectedPetId(data[0]._id);
      })
      .catch(console.error)
      .finally(() => setPetsLoading(false));
  }, []);

  // Load last 30 days of events + active prescriptions whenever the pet changes
  useEffect(() => {
    if (!selectedPetId) return;
    setEventsLoading(true);
    Promise.all([
      getEvents(selectedPetId, { from: toISODate(daysAgo(29)) }),
      getPrescriptions(selectedPetId, { activeOnly: true }),
    ])
      .then(([evs, rxs]) => {
        setEvents(evs);
        setPrescriptions(rxs);
      })
      .catch(console.error)
      .finally(() => setEventsLoading(false));
  }, [selectedPetId]);

  // Derived analytics
  const barData   = buildBarData(events);
  const donutData = buildDonutData(events);
  const streak    = calcStreak(events);
  const top       = topType(events);
  const total14   = events.filter((ev) =>
    new Date(ev.occurredAt) >= daysAgo(13)
  ).length;
  const alerts    = eventsLoading ? [] : buildAlerts(events, prescriptions);

  const hasData = events.length > 0;

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-950 tracking-tight mb-6">Routine</h1>

      {/* ── Pet selector ─────────────────────────────────────────────────── */}
      <section className="mb-6">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
          Which pet?
        </p>
        {petsLoading ? (
          <Skeleton className="h-9 w-48" />
        ) : pets.length === 0 ? (
          <p className="text-sm text-stone-500">
            No pets yet.{" "}
            <button
              onClick={() => navigate("/pets")}
              className="text-stone-900 underline underline-offset-2 font-medium"
            >
              Register one first →
            </button>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pets.map((pet) => (
              <button
                key={pet._id}
                onClick={() => setSelectedPetId(pet._id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedPetId === pet._id
                    ? "bg-stone-950 text-white border-stone-950"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                }`}
              >
                {pet.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedPetId && (
        <>
          {/* ── Stat cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {eventsLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)
            ) : (
              <>
                <div className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-1">
                  <p className="text-xs text-stone-400">14-day events</p>
                  <p className="text-2xl font-bold text-stone-950">{total14}</p>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-1">
                  <p className="text-xs text-stone-400">Day streak</p>
                  <p className="text-2xl font-bold text-stone-950">
                    {streak}
                    {streak === 30 && (
                      <span className="text-sm font-normal text-stone-400">+</span>
                    )}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-1">
                  <p className="text-xs text-stone-400">Top type</p>
                  <p className="text-sm font-bold text-stone-950 leading-tight mt-auto">
                    {top ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: TYPE_COLORS[top] }}
                        />
                        {TYPE_LABELS[top]}
                      </span>
                    ) : "—"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ── Health alerts ──────────────────────────────────────────── */}
          {!eventsLoading && <AlertsPanel alerts={alerts} />}

          {/* ── 14-day stacked bar ─────────────────────────────────────── */}
          <section className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">
              Last 14 days
            </p>
            {eventsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !hasData ? (
              <p className="text-sm text-stone-400 text-center py-8">No events in the last 30 days.</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={barData}
                  barSize={12}
                  margin={{ top: 0, right: 0, left: -28, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#a8a29e" }}
                    tickLine={false}
                    axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 9, fill: "#a8a29e" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "#f5f5f4" }} />
                  {EVENT_TYPES.map((t, i) => (
                    <Bar
                      key={t}
                      dataKey={t}
                      stackId="a"
                      fill={TYPE_COLORS[t]}
                      radius={i === EVENT_TYPES.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* ── Type distribution donut ────────────────────────────────── */}
          <section className="bg-white rounded-xl border border-stone-200 p-4 mb-8">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">
              Type distribution (30 days)
            </p>
            {eventsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !hasData ? (
              <p className="text-sm text-stone-400 text-center py-8">No events in the last 30 days.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} events`, name]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e7e5e4",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ fontSize: 11, color: "#78716c" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </section>
        </>
      )}
    </div>
  );
}
