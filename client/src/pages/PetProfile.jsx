import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, PawPrint, Flame, Plus, Pill,
  Utensils, Activity, Scissors, Zap, Stethoscope, Calendar,
  Scale, ChevronRight, Camera, Loader2,
} from "lucide-react";
import { getPetById, uploadPetAvatar } from "../api/pets.js";
import { getEvents } from "../api/events.js";
import { getPrescriptions } from "../api/prescriptions.js";

// ── Helpers ────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const mins = Math.round((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 2)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function computeStreak(events) {
  const now = new Date();
  let s = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (events.some((ev) => isSameLocalDay(new Date(ev.occurredAt), d))) s++;
    else break;
  }
  return s;
}

function dayLabel(date) {
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(date, today))     return "Today";
  if (isSameLocalDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function groupByDay(events) {
  const map = new Map();
  [...events]
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .forEach((ev) => {
      const label = dayLabel(new Date(ev.occurredAt));
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(ev);
    });
  return [...map.entries()];
}

function summarize(type, details = {}) {
  switch (type) {
    case "meal":       return [
      [details.amount, details.unit, details.food].filter(Boolean).join(" "),
      details.finished === "all"     ? "finished all" :
      details.finished === "partial" ? "left some"    :
      details.finished === "refused" ? "refused"      : null,
      details.askedForMore ? "asked for more" : null,
    ].filter(Boolean).join(" · ");
    case "medication": return [details.name, details.dose, details.unit].filter(Boolean).join(" ");
    case "activity":   return [details.name, details.duration && `${details.duration} ${details.unit || ""}`.trim()].filter(Boolean).join(" · ");
    case "poop":       return [details.consistency, details.color].filter(Boolean).join(", ");
    case "treats":     return [details.name, details.quantity && `×${details.quantity}`].filter(Boolean).join(" ");
    case "weight":     return details.weightKg ? `${details.weightKg} ${details.unit ?? "kg"}` : "";
    case "litter":     return details.action || "";
    default:           return "";
  }
}

const TYPE_META = {
  meal:       { label: "Meal",       Icon: Utensils,    dot: "bg-amber-700"  },
  medication: { label: "Medication", Icon: Pill,        dot: "bg-rose-700"   },
  activity:   { label: "Activity",   Icon: Activity,    dot: "bg-stone-600"  },
  litter:     { label: "Litter",     Icon: Calendar,    dot: "bg-stone-400"  },
  poop:       { label: "Bathroom",   Icon: Calendar,    dot: "bg-amber-900"  },
  treats:     { label: "Treats",     Icon: Zap,         dot: "bg-orange-600" },
  weight:     { label: "Weight",     Icon: Scale,       dot: "bg-[#A690A4]"    },
  vet:        { label: "Vet visit",  Icon: Stethoscope, dot: "bg-violet-600" },
  grooming:   { label: "Grooming",   Icon: Scissors,    dot: "bg-teal-600"   },
};

function resizeImage(file, maxPx = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function intervalLabel(h) {
  if (h <= 13)  return "twice daily";
  if (h <= 25)  return "once daily";
  if (h <= 50)  return "every 2 days";
  if (h <= 98)  return "every 3 days";
  if (h <= 200) return "weekly";
  return `every ${Math.round(h / 24)} days`;
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`bg-stone-100 rounded-2xl animate-pulse ${className}`} />;
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="bg-[#F5F4F7] rounded-2xl p-3 flex flex-col gap-0.5">
      <p className="text-[10px] text-stone-400 uppercase tracking-[0.08em]">{label}</p>
      <p className={`text-xl font-bold leading-tight ${accent ? "text-[#3D3170]" : "text-stone-950"}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-stone-400 leading-tight">{sub}</p>}
    </div>
  );
}

function EventRow({ event }) {
  const meta    = TYPE_META[event.type] ?? { label: event.type, Icon: Calendar, dot: "bg-stone-300" };
  const summary = summarize(event.type, event.details);
  const time    = new Date(event.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-800">{meta.label}</p>
        {summary && <p className="text-xs text-stone-500 truncate">{summary}</p>}
        {event.notes && <p className="text-xs text-stone-400 italic truncate">{event.notes}</p>}
      </div>
      <span className="text-xs text-stone-400 shrink-0 pt-0.5">{time}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function PetProfile() {
  const { petId }  = useParams();
  const navigate   = useNavigate();

  const [pet, setPet]                   = useState(null);
  const [events, setEvents]             = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const fileInputRef                    = useRef(null);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await resizeImage(file, 256);
      const updated = await uploadPetAvatar(petId, base64);
      setPet(updated);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
      // reset so same file can be re-selected
      e.target.value = "";
    }
  }

  useEffect(() => {
    Promise.all([
      getPetById(petId),
      getEvents(petId, { from: daysAgo(90).toISOString() }),
      getPrescriptions(petId).catch(() => []),
    ])
      .then(([p, evs, rxs]) => {
        setPet(p);
        setEvents(evs);
        setPrescriptions(rxs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [petId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-52" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="text-center py-16 text-stone-400 text-sm">
        Pet not found.{" "}
        <button onClick={() => navigate("/pets")} className="text-[#3D3170] font-semibold">
          Back to pets
        </button>
      </div>
    );
  }

  // Derived
  const streak      = computeStreak(events);
  const events30    = events.filter((ev) => new Date(ev.occurredAt) >= daysAgo(30));
  const lastEvent   = [...events].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))[0];
  const latestWeight = [...events]
    .filter((ev) => ev.type === "weight" && ev.details?.weightKg)
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))[0];
  const activeRxs   = prescriptions.filter((rx) => rx.active !== false);
  const recentEvs   = [...events]
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .slice(0, 30);
  const grouped     = groupByDay(recentEvs);

  const displayWeight = latestWeight
    ? `${latestWeight.details.weightKg} ${latestWeight.details.unit ?? "kg"}`
    : pet.weight
    ? `${pet.weight} kg`
    : null;

  return (
    <div>
      {/* ── Back button ───────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-5 -ml-1"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Back
      </button>

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#F0EEF3] to-[#FFFFFF] rounded-2xl border border-[#E2E0EB]/50 p-6 mb-4 text-center relative overflow-hidden">
        {/* Faint paw watermark */}
        <svg className="absolute right-3 bottom-2 opacity-[0.07] pointer-events-none" width="80" height="80" viewBox="0 0 100 100" aria-hidden="true">
          <ellipse cx="50" cy="65" rx="22" ry="18" fill="#3D3170"/>
          <ellipse cx="25" cy="40" rx="10" ry="8"  fill="#3D3170"/>
          <ellipse cx="75" cy="40" rx="10" ry="8"  fill="#3D3170"/>
          <ellipse cx="38" cy="28" rx="9"  ry="7"  fill="#3D3170"/>
          <ellipse cx="62" cy="28" rx="9"  ry="7"  fill="#3D3170"/>
        </svg>

        {/* Avatar — tap to change */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative w-20 h-20 mx-auto mb-3 group"
          aria-label="Change pet photo"
        >
          {/* Photo or fallback */}
          <div className="w-20 h-20 rounded-3xl overflow-hidden bg-[#3D3170] flex items-center justify-center shadow-[0_4px_16px_rgba(61,49,112,0.30)]">
            {pet.avatarUrl ? (
              <img
                src={pet.avatarUrl}
                alt={pet.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <PawPrint size={36} strokeWidth={1.75} className="text-white" />
            )}
          </div>
          {/* Camera badge */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-[#F0EEF3] shadow-sm flex items-center justify-center group-hover:bg-[#3D3170] transition-colors">
            {uploading
              ? <Loader2 size={13} className="text-[#3D3170] group-hover:text-white animate-spin" />
              : <Camera size={13} className="text-[#3D3170] group-hover:text-white transition-colors" />
            }
          </div>
        </button>

        {/* Name + meta */}
        <h1 className="text-2xl font-bold text-stone-950 tracking-tight">{pet.name}</h1>
        <p className="text-sm text-stone-500 capitalize tracking-[0.03em] mt-0.5">
          {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
        </p>

        {/* Info pills */}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {pet.age != null && (
            <span className="text-xs font-medium bg-white/80 border border-stone-200/60 text-stone-600 rounded-full px-3 py-1">
              {pet.age} yr
            </span>
          )}
          {displayWeight && (
            <span className="text-xs font-medium bg-white/80 border border-stone-200/60 text-stone-600 rounded-full px-3 py-1">
              {displayWeight}
              {latestWeight && (
                <span className="text-stone-400 ml-1">
                  · {timeAgo(latestWeight.occurredAt)}
                </span>
              )}
            </span>
          )}
          {streak > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold bg-[#F0EEF3] border border-[#E2E0EB]/60 text-[#3D3170] rounded-full px-3 py-1">
              <Flame size={11} />
              {streak} day streak
            </span>
          )}
        </div>

        {/* Log CTA */}
        <button
          onClick={() => navigate("/log", { state: { preselectedPetId: petId } })}
          className="mt-4 inline-flex items-center gap-2 bg-[#3D3170] hover:bg-[#2E2454] text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors active:scale-[0.98]"
        >
          <Plus size={15} strokeWidth={2.5} />
          Log for {pet.name}
        </button>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard
          label="Streak"
          value={streak}
          sub="days"
          accent={streak > 0}
        />
        <StatCard
          label="30-day events"
          value={events30.length}
          sub="logged"
        />
        <StatCard
          label="Last event"
          value={lastEvent ? timeAgo(lastEvent.occurredAt) : "—"}
          sub={lastEvent ? TYPE_META[lastEvent.type]?.label ?? lastEvent.type : "none yet"}
        />
      </div>

      {/* ── Active prescriptions ──────────────────────────────────────────── */}
      {activeRxs.length > 0 && (
        <section className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3D3170] shrink-0" />
            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.08em]">
              Active prescriptions
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {activeRxs.map((rx) => (
              <div
                key={rx._id}
                className="flex items-center gap-3 bg-[#F5F4F7] rounded-xl px-3 py-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <Pill size={13} className="text-rose-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-800 truncate">{rx.medicationName}</p>
                  <p className="text-xs text-stone-400">
                    {rx.dose ? `${rx.dose}${rx.doseUnit ? ` ${rx.doseUnit}` : ""} · ` : ""}
                    {intervalLabel(rx.intervalHours)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Event timeline ────────────────────────────────────────────────── */}
      <section className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3D3170] shrink-0" />
          <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.08em]">
            Recent events
          </p>
        </div>

        {grouped.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6">No events logged yet.</p>
        ) : (
          grouped.map(([label, evs]) => (
            <div key={label} className="mb-1 last:mb-0">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider pt-2 pb-1 first:pt-0">
                {label}
              </p>
              {evs.map((ev) => (
                <EventRow key={ev._id} event={ev} />
              ))}
            </div>
          ))
        )}
      </section>

      {/* ── Manage link ───────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate("/pets")}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-stone-200/60 bg-[#FFFFFF] text-sm text-stone-500 hover:border-stone-300 transition-colors active:scale-[0.98] mb-2"
      >
        <span className="flex items-center gap-2">
          <PawPrint size={13} strokeWidth={1.75} className="text-stone-400" />
          Edit pet & prescriptions
        </span>
        <ChevronRight size={14} className="text-stone-300" />
      </button>
    </div>
  );
}
