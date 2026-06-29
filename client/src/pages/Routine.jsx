import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Info, Flame } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { getPets } from "../api/pets.js";
import { getEvents } from "../api/events.js";
import { getPrescriptions } from "../api/prescriptions.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
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

function intervalLabel(h) {
  if (h <= 13)  return "twice daily";
  if (h <= 25)  return "once daily";
  if (h <= 50)  return "every 2 days";
  if (h <= 98)  return "every 3 days";
  if (h <= 200) return "weekly";
  return `every ${Math.round(h / 24)} days`;
}

// ── Data builders ─────────────────────────────────────────────────────────────

// Activity: daily total minutes over last 14 days
function buildActivityData(events) {
  return Array.from({ length: 14 }, (_, i) => {
    const day = daysAgo(13 - i);
    const dayEvents = events.filter(
      (ev) => ev.type === "activity" && isSameLocalDay(new Date(ev.occurredAt), day)
    );
    const minutes = dayEvents.reduce((sum, ev) => {
      const dur  = Number(ev.details?.duration) || 0;
      const unit = ev.details?.unit || "min";
      return sum + (unit === "hr" ? dur * 60 : dur);
    }, 0);
    return {
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      minutes,
      sessions: dayEvents.length,
    };
  });
}

// Meal grid: 14-day appetite snapshot
const MEAL_DOT = {
  all:     { bg: "bg-emerald-700", label: "Finished all"  },
  partial: { bg: "bg-amber-600",   label: "Left some"     },
  refused: { bg: "bg-rose-600",    label: "Refused"       },
  logged:  { bg: "bg-stone-500",   label: "Logged"        },
  none:    { bg: "bg-stone-200",   label: "No meal"       },
};

function buildMealGrid(events) {
  return Array.from({ length: 14 }, (_, i) => {
    const day   = daysAgo(13 - i);
    const meals = events.filter(
      (ev) => ev.type === "meal" && isSameLocalDay(new Date(ev.occurredAt), day)
    );
    const status = meals.length === 0
      ? "none"
      : (meals[0].details?.finished ?? "logged");
    return {
      day,
      label:  day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      status,
      count:  meals.length,
    };
  });
}

// Poop health donut
const POOP_COLORS = {
  normal:  "#22c55e",
  loose:   "#f59e0b",
  liquid:  "#ef4444",
  solid:   "#78716c",
  unknown: "#d1d5db",
};
const POOP_LABELS = {
  normal: "Normal", loose: "Loose", liquid: "Liquid", solid: "Very solid", unknown: "Unknown",
};

function buildPoopData(events) {
  const poops = events.filter((ev) => ev.type === "poop");
  if (poops.length < 2) return null;
  const counts = {};
  poops.forEach((ev) => {
    const c = ev.details?.consistency || "unknown";
    counts[c] = (counts[c] ?? 0) + 1;
  });
  return Object.entries(counts).map(([k, v]) => ({
    name:  POOP_LABELS[k] ?? k,
    value: v,
    fill:  POOP_COLORS[k] ?? "#d1d5db",
  }));
}

// Medication adherence per prescription
function buildMedAdherence(prescriptions, events) {
  const now = new Date();
  return prescriptions
    .filter((rx) => {
      const start = new Date(rx.startDate);
      const end   = rx.endDate ? new Date(rx.endDate) : null;
      return now >= start && (!end || now <= end);
    })
    .map((rx) => {
      const windowStart    = new Date(Math.max(new Date(rx.startDate).getTime(), daysAgo(6).getTime()));
      const hoursInWindow  = (now - windowStart) / 3_600_000;
      const expected       = Math.max(1, Math.round(hoursInWindow / rx.intervalHours));
      const rxName         = rx.medicationName.toLowerCase();
      const logged         = events.filter(
        (ev) =>
          ev.type === "medication" &&
          (ev.details?.name ?? "").toLowerCase() === rxName &&
          new Date(ev.occurredAt) >= windowStart
      ).length;
      return { name: rx.medicationName, logged, expected, pct: Math.min(1, logged / expected) };
    });
}

// ── Health alerts ─────────────────────────────────────────────────────────────
function buildAlerts(events, prescriptions = []) {
  if (!events.length && !prescriptions.length) return [];

  const alerts  = [];
  const now     = new Date();
  const hoursAgo = (date) => (now - date) / 3_600_000;
  const dSinceMs = (date) => (now - date) / 86_400_000;

  if (events.length) {
    const lastOf = (type) => {
      const hit = events.find((ev) => ev.type === type);
      return hit ? new Date(hit.occurredAt) : null;
    };
    const countInWindow = (type, fromDate, toDate = now) =>
      events.filter((ev) => {
        const d = new Date(ev.occurredAt);
        return ev.type === type && d >= fromDate && d <= toDate;
      }).length;

    // 1. No events today
    if (!events.some((ev) => isSameLocalDay(new Date(ev.occurredAt), now))) {
      alerts.push({ level: "warn", text: "No events logged today — streak at risk." });
    }

    // 2. No meal in >24h
    const lastMeal = lastOf("meal");
    if (lastMeal && hoursAgo(lastMeal) > 24) {
      alerts.push({ level: "warn", text: `No meal logged in ${Math.round(hoursAgo(lastMeal))} hours.` });
    }

    // 3. Appetite alerts
    const recentMeals  = events.filter(
      (ev) => ev.type === "meal" && new Date(ev.occurredAt) >= daysAgo(4)
    );
    const refusals = recentMeals.filter((ev) => ev.details?.finished === "refused").length;
    if (refusals >= 2) {
      alerts.push({ level: "warn", text: `Pet has refused food ${refusals} times in the last 5 days — consider a vet check.` });
    }
    const hungryCount = events.filter(
      (ev) => ev.type === "meal" && ev.details?.askedForMore === true && new Date(ev.occurredAt) >= daysAgo(6)
    ).length;
    if (hungryCount >= 3) {
      alerts.push({ level: "info", text: `Pet has asked for more food ${hungryCount} times this week — portions may need adjusting.` });
    }

    // 4. No poop in >2 days
    const lastPoop = lastOf("poop");
    if (lastPoop && dSinceMs(lastPoop) > 2) {
      alerts.push({ level: "warn", text: `No poop logged in ${Math.floor(dSinceMs(lastPoop))} days — could indicate a GI issue.` });
    }

    // 5. Abnormal poop consistency 2+ times in 3 days
    const ABNORMAL   = ["loose", "liquid", "solid"];
    const weirdPoops = events.filter(
      (ev) => ev.type === "poop" && new Date(ev.occurredAt) >= daysAgo(3) && ABNORMAL.includes(ev.details?.consistency)
    );
    if (weirdPoops.length >= 2) {
      const counts   = {};
      weirdPoops.forEach((ev) => { const c = ev.details?.consistency; if (c) counts[c] = (counts[c] ?? 0) + 1; });
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      alerts.push({ level: "warn", text: `Poop has been ${dominant === "solid" ? "very solid" : dominant} for the past few days — worth a vet check if it continues.` });
    }

    // 6. Activity drop week-over-week
    const actThis = countInWindow("activity", daysAgo(6));
    const actPrev = countInWindow("activity", daysAgo(13), daysAgo(6));
    if (actPrev >= 3 && actThis < actPrev / 2) {
      alerts.push({ level: "info", text: `Activity down this week: ${actThis} vs ${actPrev} last week.` });
    }
  }

  // 7. Prescription overdue
  for (const rx of prescriptions) {
    const start = new Date(rx.startDate);
    const end   = rx.endDate ? new Date(rx.endDate) : null;
    if (now < start || (end && now > end)) continue;

    const rxName  = rx.medicationName.toLowerCase();
    const lastLog = events.find(
      (ev) =>
        ev.type === "medication" &&
        (ev.details?.name ?? "").toLowerCase() === rxName &&
        new Date(ev.occurredAt) >= start
    );
    const hoursAgo = (date) => (now - date) / 3_600_000;
    const sinceH   = lastLog ? hoursAgo(new Date(lastLog.occurredAt)) : hoursAgo(start);
    if (sinceH > rx.intervalHours * 1.5) {
      alerts.push({
        level: "warn",
        text:  `${rx.medicationName} is overdue — prescribed ${intervalLabel(rx.intervalHours)}, last logged ${lastLog ? `${Math.round(sinceH)}h ago` : "not logged yet"}.`,
      });
    }
  }

  return alerts;
}

// Weight trend: all weight events sorted chronologically
function buildWeightData(events) {
  return events
    .filter((ev) => ev.type === "weight" && ev.details?.weightKg != null)
    .map((ev) => ({
      date: new Date(ev.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      kg:   Number(ev.details.weightKg),
      ts:   new Date(ev.occurredAt).getTime(),
    }))
    .sort((a, b) => a.ts - b.ts);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`bg-stone-100 rounded-2xl animate-pulse ${className}`} />;
}

function SectionCard({ title, children, empty, emptyText }) {
  return (
    <section className="bg-[#FFFCF7] rounded-2xl border border-stone-200/60 shadow-sm hover:shadow-md transition-shadow duration-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B45309] shrink-0" />
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{title}</p>
      </div>
      {empty ? (
        <p className="text-sm text-stone-400 text-center py-6">{emptyText ?? "Not enough data yet."}</p>
      ) : children}
    </section>
  );
}

function AlertsPanel({ alerts }) {
  if (!alerts.length) return null;
  return (
    <section className="mb-4 flex flex-col gap-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${
            a.level === "warn"
              ? "bg-orange-50 border-orange-200 text-orange-900"
              : "bg-sky-50 border-sky-200 text-sky-900"
          }`}
        >
          {a.level === "warn"
            ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-orange-500" />
            : <Info          size={15} className="mt-0.5 shrink-0 text-sky-500"   />}
          <span>{a.text}</span>
        </div>
      ))}
    </section>
  );
}

// Weight tooltip
function WeightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#FFFCF7] border border-stone-200/60 rounded-xl shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-stone-700 mb-0.5">{label}</p>
      <p className="text-[#B45309] font-bold">{payload[0]?.value} kg</p>
    </div>
  );
}

// Activity tooltip
function ActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const { minutes, sessions } = payload[0]?.payload ?? {};
  if (!minutes && !sessions) return null;
  return (
    <div className="bg-[#FFFCF7] border border-stone-200/60 rounded-xl shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-stone-700 mb-1">{label}</p>
      <p className="text-stone-500">{minutes} min · {sessions} session{sessions !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Routine() {
  const navigate = useNavigate();

  const [pets, setPets]                   = useState([]);
  const [petsLoading, setPetsLoading]     = useState(true);
  const [selectedPetId, setSelectedPetId] = useState(null);

  const [events, setEvents]               = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]             = useState(false);

  useEffect(() => {
    getPets()
      .then((data) => {
        setPets(data);
        if (data.length === 1) setSelectedPetId(data[0]._id);
      })
      .catch(console.error)
      .finally(() => setPetsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPetId) return;
    setLoading(true);
    Promise.all([
      getEvents(selectedPetId, { from: toISODate(daysAgo(29)) }),
      getPrescriptions(selectedPetId, { activeOnly: true }),
    ])
      .then(([evs, rxs]) => { setEvents(evs); setPrescriptions(rxs); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedPetId]);

  // Derived data
  const activityData = buildActivityData(events);
  const mealGrid     = buildMealGrid(events);
  const poopData     = buildPoopData(events);
  const medAdherence = buildMedAdherence(prescriptions, events);
  const weightData   = buildWeightData(events);
  const alerts       = loading ? [] : buildAlerts(events, prescriptions);

  const hasActivity = activityData.some((d) => d.minutes > 0);
  const hasWeight   = weightData.length >= 2;
  const streak      = (() => {
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const day = daysAgo(i);
      if (events.some((ev) => isSameLocalDay(new Date(ev.occurredAt), day))) s++;
      else break;
    }
    return s;
  })();
  const total14 = events.filter((ev) => new Date(ev.occurredAt) >= daysAgo(13)).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-950 tracking-tight mb-6">Routine</h1>

      {/* ── Pet selector ─────────────────────────────────────────────────── */}
      <section className="mb-6">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Which pet?</p>
        {petsLoading ? (
          <Skeleton className="h-9 w-48" />
        ) : pets.length === 0 ? (
          <p className="text-sm text-stone-500">
            No pets yet.{" "}
            <button
              onClick={() => navigate("/pets")}
              className="text-[#B45309] font-semibold hover:text-[#92400E] transition-colors"
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
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors active:scale-[0.97] duration-150 ${
                  selectedPetId === pet._id
                    ? "bg-[#B45309] text-white border-[#B45309]"
                    : "bg-[#FFFCF7] text-stone-600 border-stone-200 hover:border-stone-300"
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
          {/* ── Stat cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {loading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)
            ) : (
              <>
                {/* 14-day events */}
                <div className="bg-[#FFFCF7] rounded-2xl border border-stone-200/60 shadow-sm p-3 flex flex-col gap-1">
                  <p className="text-xs text-stone-400 leading-tight">14-day events</p>
                  <p className="text-2xl font-bold text-stone-950">{total14}</p>
                </div>

                {/* Day streak — emotionally charged, amber glow when active */}
                <div className={`rounded-2xl border shadow-sm p-3 flex flex-col gap-1 transition-all duration-300 ${
                  streak > 0
                    ? "bg-gradient-to-br from-amber-50 to-[#FFFCF7] border-amber-200/80 shadow-amber-100"
                    : "bg-[#FFFCF7] border-stone-200/60"
                }`}>
                  <p className="text-xs text-stone-400 leading-tight flex items-center gap-1">
                    Streak
                    {streak > 0 && <Flame size={10} className="text-[#B45309]" />}
                  </p>
                  <p className={`text-2xl font-bold ${streak > 0 ? "text-[#B45309]" : "text-stone-950"}`}>
                    {streak}
                    {streak === 30 && <span className="text-sm font-normal text-stone-400">+</span>}
                  </p>
                </div>

                {/* Prescriptions */}
                <div className="bg-[#FFFCF7] rounded-2xl border border-stone-200/60 shadow-sm p-3 flex flex-col gap-1">
                  <p className="text-xs text-stone-400 leading-tight">Prescriptions</p>
                  <p className={`text-2xl font-bold ${prescriptions.length > 0 ? "text-[#B45309]" : "text-stone-950"}`}>
                    {prescriptions.length}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ── Health alerts ────────────────────────────────────────────── */}
          {!loading && <AlertsPanel alerts={alerts} />}

          {/* ── Activity trend ────────────────────────────────────────────── */}
          <SectionCard
            title="Activity — daily minutes (14 days)"
            empty={!loading && !hasActivity}
            emptyText="No activity logged yet."
          >
            {loading ? (
              <Skeleton className="h-36 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={activityData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#B45309" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#B45309" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
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
                  <Tooltip
                    content={<ActivityTooltip />}
                    cursor={{ stroke: "#e7e5e4", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="#B45309"
                    strokeWidth={2}
                    fill="url(#actGrad)"
                    dot={{ r: 3, fill: "#B45309", strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: "#B45309" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* ── Meal regularity grid ──────────────────────────────────────── */}
          <SectionCard title="Meals — 14-day appetite">
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1.5 mb-3">
                  {mealGrid.map(({ day, label, status, count }) => {
                    const { bg } = MEAL_DOT[status] ?? MEAL_DOT.none;
                    return (
                      <div
                        key={day.toISOString()}
                        className="flex flex-col items-center gap-1"
                        title={`${label}${count ? ` · ${count} meal${count > 1 ? "s" : ""}` : ""}`}
                      >
                        <div className={`w-7 h-7 rounded-lg ${bg}`} />
                        <span className="text-[9px] text-stone-400 leading-none">
                          {day.toLocaleDateString("en-US", { day: "numeric" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(MEAL_DOT).map(([k, { bg, label }]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-sm ${bg}`} />
                      <span className="text-xs text-stone-400">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          {/* ── Poop health ───────────────────────────────────────────────── */}
          <SectionCard
            title="Digestive health — consistency (30 days)"
            empty={!loading && !poopData}
            emptyText="Log at least 2 poop events to see the breakdown."
          >
            {loading ? (
              <Skeleton className="h-44 w-full" />
            ) : poopData ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={poopData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {poopData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} time${value !== 1 ? "s" : ""}`, name]}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid rgba(0,0,0,0.06)",
                      background: "#FFFCF7",
                      fontSize: "12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 11, color: "#78716c" }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </SectionCard>

          {/* ── Medication adherence ──────────────────────────────────────── */}
          {medAdherence.length > 0 && (
            <SectionCard title="Medication adherence — this week">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="flex flex-col gap-3">
                  {medAdherence.map(({ name, logged, expected, pct }) => (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-stone-700 truncate">{name}</span>
                        <span className="text-stone-400 shrink-0 ml-2">{logged} / {expected} doses</span>
                      </div>
                      <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 1 ? "bg-emerald-700" : pct >= 0.5 ? "bg-amber-600" : "bg-rose-600"
                          }`}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* ── Weight trend ──────────────────────────────────────────────── */}
          <SectionCard
            title="Weight — trend"
            empty={!loading && !hasWeight}
            emptyText="Log at least 2 weight events to see the trend."
          >
            {loading ? (
              <Skeleton className="h-36 w-full" />
            ) : hasWeight ? (
              <>
                {/* Mini stat row */}
                {(() => {
                  const first   = weightData[0].kg;
                  const current = weightData[weightData.length - 1].kg;
                  const delta   = +(current - first).toFixed(2);
                  const min     = Math.min(...weightData.map((d) => d.kg));
                  const max     = Math.max(...weightData.map((d) => d.kg));
                  return (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: "Current",  value: `${current} kg` },
                        { label: "Change",   value: delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta} kg`, accent: delta < 0 ? "text-emerald-700" : delta > 0 ? "text-orange-600" : "" },
                        { label: "Range",    value: `${min}–${max} kg` },
                      ].map(({ label, value, accent }) => (
                        <div key={label} className="bg-[#FAF7F0] rounded-xl p-2.5">
                          <p className="text-[10px] text-stone-400 mb-0.5">{label}</p>
                          <p className={`text-sm font-bold ${accent || "text-stone-950"}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={weightData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "#a8a29e" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={([min, max]) => [
                        Math.max(0, parseFloat((min - 0.5).toFixed(1))),
                        parseFloat((max + 0.5).toFixed(1)),
                      ]}
                      tick={{ fontSize: 9, fill: "#a8a29e" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      content={<WeightTooltip />}
                      cursor={{ stroke: "#e7e5e4", strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="kg"
                      stroke="#B45309"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#B45309", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#B45309" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : null}
          </SectionCard>
        </>
      )}
    </div>
  );
}
