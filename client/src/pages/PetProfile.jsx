import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, PawPrint, Flame, Plus, Pill,
  Utensils, Activity, Scissors, Zap, Stethoscope, Calendar,
  Scale, ChevronRight, ChevronDown, Camera, Loader2, FileText,
  Syringe, Trash2, Check, Pencil,
} from "lucide-react";
import { getPetById, uploadPetAvatar, deletePet } from "../api/pets.js";
import { apiFetchBlob } from "../api/apiClient.js";
import { getEvents, updateEvent, deleteEvent } from "../api/events.js";
import { getPrescriptions } from "../api/prescriptions.js";
import { getVaccines, createVaccine, updateVaccine, deleteVaccine } from "../api/vaccines.js";
import DetailFields, { inputClass } from "../components/DetailFields.jsx";

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

function vaccineStatus(nextDue) {
  if (!nextDue) return null;
  const days = Math.ceil((new Date(nextDue) - Date.now()) / 86400000);
  if (days < 0)   return { label: "Overdue",  color: "bg-red-100 text-red-700"   };
  if (days <= 30) return { label: "Due soon", color: "bg-amber-100 text-amber-700" };
  return           { label: "Up to date", color: "bg-green-100 text-green-700" };
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

function EventRow({ event, petId, onUpdated, onDeleted }) {
  const meta    = TYPE_META[event.type] ?? { label: event.type, Icon: Calendar, dot: "bg-stone-300" };
  const summary = summarize(event.type, event.details);
  const time    = new Date(event.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const [mode, setMode]               = useState(null); // null | "edit" | "confirm-delete"
  const [editDetails, setEditDetails] = useState({});
  const [editNotes, setEditNotes]     = useState("");
  const [editTime, setEditTime]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState(null);

  function openEdit() {
    setEditDetails({ ...(event.details ?? {}) });
    setEditNotes(event.notes ?? "");
    const d = new Date(event.occurredAt);
    setEditTime(new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setSaveError(null);
    setMode("edit");
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await updateEvent(petId, event._id, {
        details: editDetails,
        notes: editNotes.trim() || undefined,
        occurredAt: new Date(editTime).toISOString(),
      });
      onUpdated(updated);
      setMode(null);
    } catch (err) {
      console.error("Update failed:", err);
      setSaveError(err.message || "Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteEvent(petId, event._id);
      onDeleted(event._id);
    } catch (err) {
      console.error("Delete failed:", err);
      setSaving(false);
    }
  }

  if (mode === "edit") {
    return (
      <div className="py-3 border-b border-stone-100 last:border-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-[#3D3170]">{meta.label}</span>
          <button onClick={() => setMode(null)} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">Cancel</button>
        </div>
        <DetailFields type={event.type} details={editDetails} onChange={setEditDetails} />
        <input
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder="Notes (optional)"
          className={inputClass}
        />
        <input
          type="datetime-local"
          value={editTime}
          max={new Date(new Date() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
          onChange={(e) => setEditTime(e.target.value)}
          className={inputClass}
        />
        {saveError && (
          <p className="text-xs text-red-500 px-1">{saveError}</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-[#3D3170] hover:bg-[#2E2454] text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <Check size={13} />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    );
  }

  if (mode === "confirm-delete") {
    return (
      <div className="py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
        <p className="text-xs text-stone-600 flex-1">Delete this {meta.label} event?</p>
        <button
          onClick={() => setMode(null)}
          className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={saving}
          className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "…" : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0 group">
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-800">{meta.label}</p>
        {summary && <p className="text-xs text-stone-500 truncate">{summary}</p>}
        {event.notes && <p className="text-xs text-stone-400 italic truncate">{event.notes}</p>}
      </div>
      <span className="text-xs text-stone-400 shrink-0 pt-0.5 mr-1">{time}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={openEdit}
          className="p-1.5 rounded-lg text-stone-300 hover:text-[#3D3170] hover:bg-[#F0EEF3] transition-colors"
          aria-label="Edit event"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => setMode("confirm-delete")}
          className="p-1.5 rounded-lg text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          aria-label="Delete event"
        >
          <Trash2 size={12} />
        </button>
      </div>
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
  const [reportDays, setReportDays]     = useState(30);
  const [reportConcern, setReportConcern] = useState("");
  const [downloading, setDownloading]   = useState(false);
  const [eventsOpen, setEventsOpen]     = useState(false);
  const [vaccines, setVaccines]         = useState([]);
  const [vaccinesOpen, setVaccinesOpen] = useState(true);
  const [vaccineForm, setVaccineForm]   = useState({ name: "", lastGiven: "", nextDue: "", notes: "", clinic: "" });
  const [addingVaccine, setAddingVaccine] = useState(false);
  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [editingVaccineId, setEditingVaccineId]   = useState(null);
  const [editVaccineForm, setEditVaccineForm]     = useState({});
  const [savingVaccine, setSavingVaccine]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const fileInputRef                    = useRef(null);

  async function handleDeletePet() {
    setDeleting(true);
    try {
      await deletePet(petId);
      navigate("/pets");
    } catch (err) {
      console.error("Delete pet failed:", err);
      setDeleting(false);
    }
  }

  async function handleDownloadReport() {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ days: reportDays });
      if (reportConcern.trim()) params.set("concern", reportConcern.trim());
      const { blob, filename } = await apiFetchBlob(
        `/api/pets/${petId}/report?${params}`
      );
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Report download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

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

  async function handleAddVaccine(e) {
    e.preventDefault();
    if (!vaccineForm.name.trim()) return;
    setAddingVaccine(true);
    try {
      const v = await createVaccine(petId, vaccineForm);
      setVaccines((prev) => [...prev, v].sort((a, b) => {
        if (!a.nextDue) return 1;
        if (!b.nextDue) return -1;
        return new Date(a.nextDue) - new Date(b.nextDue);
      }));
      setVaccineForm({ name: "", lastGiven: "", nextDue: "", notes: "", clinic: "" });
      setShowVaccineForm(false);
    } catch (err) {
      console.error("Add vaccine failed:", err);
    } finally {
      setAddingVaccine(false);
    }
  }

  async function handleDeleteVaccine(vaccineId) {
    try {
      await deleteVaccine(petId, vaccineId);
      setVaccines((prev) => prev.filter((v) => v._id !== vaccineId));
    } catch (err) {
      console.error("Delete vaccine failed:", err);
    }
  }

  function startEditVaccine(v) {
    setEditingVaccineId(v._id);
    setEditVaccineForm({
      name:      v.name      ?? "",
      lastGiven: v.lastGiven ? v.lastGiven.slice(0, 10) : "",
      nextDue:   v.nextDue   ? v.nextDue.slice(0, 10)   : "",
      clinic:    v.clinic    ?? "",
      notes:     v.notes     ?? "",
    });
  }

  async function handleSaveVaccine(e) {
    e.preventDefault();
    if (!editVaccineForm.name.trim()) return;
    setSavingVaccine(true);
    try {
      const updated = await updateVaccine(petId, editingVaccineId, editVaccineForm);
      setVaccines((prev) =>
        prev.map((v) => (v._id === editingVaccineId ? updated : v))
            .sort((a, b) => {
              if (!a.nextDue && !b.nextDue) return 0;
              if (!a.nextDue) return 1;
              if (!b.nextDue) return -1;
              return new Date(a.nextDue) - new Date(b.nextDue);
            })
      );
      setEditingVaccineId(null);
    } catch (err) {
      console.error("Update vaccine failed:", err);
    } finally {
      setSavingVaccine(false);
    }
  }

  useEffect(() => {
    Promise.all([
      getPetById(petId),
      getEvents(petId, { from: daysAgo(90).toISOString() }),
      getPrescriptions(petId).catch(() => []),
      getVaccines(petId).catch(() => []),
    ])
      .then(([p, evs, rxs, vax]) => {
        setPet(p);
        setEvents(evs);
        setPrescriptions(rxs);
        setVaccines(vax);
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

      {/* ── Desktop 2-col grid ──────────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">

      {/* ── Left col: hero + stats ──────────────────────────────────────── */}
      <div>

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

      </div>{/* end left col */}

      {/* ── Right col: detail cards ─────────────────────────────────────── */}
      <div>

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

      {/* ── Vaccines ─────────────────────────────────────────────────────── */}
      <section className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 shadow-sm mb-4 overflow-hidden">
        <button
          onClick={() => setVaccinesOpen((o) => !o)}
          className="w-full flex items-center gap-2 p-4 hover:bg-[#F5F4F7]/60 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#3D3170] shrink-0" />
          <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.08em] flex-1 text-left">
            Vaccines
          </p>
          {vaccines.some((v) => v.nextDue && new Date(v.nextDue) < Date.now()) && (
            <span className="text-[10px] font-semibold bg-red-100 text-red-700 rounded-full px-2 py-0.5 mr-1">
              Overdue
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-stone-400 transition-transform duration-200 ${vaccinesOpen ? "rotate-180" : ""}`}
          />
        </button>

        {vaccinesOpen && (
          <div className="px-4 pb-4">
            {vaccines.length === 0 && !showVaccineForm ? (
              <p className="text-sm text-stone-400 text-center py-3">No vaccines recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {vaccines.map((v) => {
                  const status = vaccineStatus(v.nextDue);

                  // ── Inline edit form ──────────────────────────────────────
                  if (editingVaccineId === v._id) {
                    return (
                      <form
                        key={v._id}
                        onSubmit={handleSaveVaccine}
                        className="bg-[#F5F4F7] rounded-xl p-3 flex flex-col gap-2"
                      >
                        <input
                          required
                          placeholder="Vaccine name"
                          value={editVaccineForm.name}
                          onChange={(e) => setEditVaccineForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#3D3170]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-400 uppercase tracking-wide mb-1 block">Last given</label>
                            <input
                              type="date"
                              value={editVaccineForm.lastGiven}
                              onChange={(e) => setEditVaccineForm((f) => ({ ...f, lastGiven: e.target.value }))}
                              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#3D3170]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 uppercase tracking-wide mb-1 block">Next due</label>
                            <input
                              type="date"
                              value={editVaccineForm.nextDue}
                              onChange={(e) => setEditVaccineForm((f) => ({ ...f, nextDue: e.target.value }))}
                              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#3D3170]"
                            />
                          </div>
                        </div>
                        <input
                          placeholder="Clinic (optional)"
                          value={editVaccineForm.clinic}
                          onChange={(e) => setEditVaccineForm((f) => ({ ...f, clinic: e.target.value }))}
                          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#3D3170]"
                        />
                        <input
                          placeholder="Notes (optional)"
                          value={editVaccineForm.notes}
                          onChange={(e) => setEditVaccineForm((f) => ({ ...f, notes: e.target.value }))}
                          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#3D3170]"
                        />
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setEditingVaccineId(null)}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingVaccine}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-[#3D3170] hover:bg-[#2E2454] disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {savingVaccine ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            Save
                          </button>
                        </div>
                      </form>
                    );
                  }

                  // ── Display row ───────────────────────────────────────────
                  return (
                    <div key={v._id} className="flex items-center gap-3 bg-[#F5F4F7] rounded-xl px-3 py-2.5">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                        <Syringe size={13} className="text-violet-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-stone-800">{v.name}</p>
                          {status && (
                            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${status.color}`}>
                              {status.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {v.lastGiven && `Given: ${new Date(v.lastGiven).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                          {v.lastGiven && v.nextDue && "  ·  "}
                          {v.nextDue && `Due: ${new Date(v.nextDue).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                          {v.clinic && `  ·  ${v.clinic}`}
                        </p>
                        {v.notes && <p className="text-xs text-stone-400 italic truncate">{v.notes}</p>}
                      </div>
                      <button
                        onClick={() => startEditVaccine(v)}
                        className="p-1.5 rounded-lg hover:bg-violet-50 text-stone-300 hover:text-violet-600 transition-colors shrink-0"
                        aria-label="Edit vaccine"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteVaccine(v._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors shrink-0"
                        aria-label="Delete vaccine"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {showVaccineForm ? (
              <form onSubmit={handleAddVaccine} className="bg-[#F5F4F7] rounded-xl p-3 flex flex-col gap-2">
                <input
                  required
                  placeholder="Vaccine name (e.g. Rabies)"
                  value={vaccineForm.name}
                  onChange={(e) => setVaccineForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#3D3170]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-400 uppercase tracking-wide mb-1 block">Last given</label>
                    <input
                      type="date"
                      value={vaccineForm.lastGiven}
                      onChange={(e) => setVaccineForm((f) => ({ ...f, lastGiven: e.target.value }))}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#3D3170]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 uppercase tracking-wide mb-1 block">Next due</label>
                    <input
                      type="date"
                      value={vaccineForm.nextDue}
                      onChange={(e) => setVaccineForm((f) => ({ ...f, nextDue: e.target.value }))}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#3D3170]"
                    />
                  </div>
                </div>
                <input
                  placeholder="Clinic (optional)"
                  value={vaccineForm.clinic}
                  onChange={(e) => setVaccineForm((f) => ({ ...f, clinic: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#3D3170]"
                />
                <input
                  placeholder="Notes (optional)"
                  value={vaccineForm.notes}
                  onChange={(e) => setVaccineForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#3D3170]"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowVaccineForm(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingVaccine}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-[#3D3170] hover:bg-[#2E2454] disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {addingVaccine ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowVaccineForm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-[#3D3170] bg-[#F0EEF3] hover:bg-[#E2E0EB] transition-colors"
              >
                <Plus size={12} strokeWidth={2.5} />
                Add vaccine
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Event timeline ────────────────────────────────────────────────── */}
      <section className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 shadow-sm mb-4 overflow-hidden">
        <button
          onClick={() => setEventsOpen((o) => !o)}
          className="w-full flex items-center gap-2 p-4 hover:bg-[#F5F4F7]/60 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#3D3170] shrink-0" />
          <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.08em] flex-1 text-left">
            Recent events
          </p>
          <span className="text-xs text-stone-400 mr-1">
            {recentEvs.length} logged
          </span>
          <ChevronDown
            size={14}
            className={`text-stone-400 transition-transform duration-200 ${eventsOpen ? "rotate-180" : ""}`}
          />
        </button>

        {eventsOpen && (
          <div className="px-4 pb-4">
            {grouped.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">No events logged yet.</p>
            ) : (
              grouped.map(([label, evs]) => (
                <div key={label} className="mb-1 last:mb-0">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider pt-2 pb-1 first:pt-0">
                    {label}
                  </p>
                  {evs.map((ev) => (
                    <EventRow
                      key={ev._id}
                      event={ev}
                      petId={petId}
                      onUpdated={(updated) => setEvents((prev) => prev.map((e) => e._id === updated._id ? updated : e))}
                      onDeleted={(id) => setEvents((prev) => prev.filter((e) => e._id !== id))}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* ── Vet report ────────────────────────────────────────────────────── */}
      <section className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3D3170] shrink-0" />
          <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.08em]">
            Vet report
          </p>
        </div>
        <p className="text-xs text-stone-500 mb-3 leading-relaxed">
          {`Generate a clinical PDF for ${pet.name}'s vet visit — includes alerts, medications, weight, appetite, and stool.`}
        </p>
        {/* Reason for visit */}
        <input
          type="text"
          placeholder="Reason for visit / owner concern (optional)"
          value={reportConcern}
          onChange={(e) => setReportConcern(e.target.value)}
          maxLength={200}
          className="w-full rounded-xl border border-stone-200 bg-[#F5F4F7] px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#3D3170] mb-3"
        />
        <div className="flex items-center gap-2">
          {/* Day selector */}
          <div className="flex gap-1">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setReportDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  reportDays === d
                    ? "bg-[#3D3170] text-white"
                    : "bg-[#F0EEF3] text-[#3D3170] hover:bg-[#E2E0EB]"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          {/* Download button */}
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="ml-auto flex items-center gap-2 bg-[#3D3170] hover:bg-[#2E2454] disabled:opacity-60 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors active:scale-[0.98]"
          >
            {downloading
              ? <Loader2 size={14} className="animate-spin" />
              : <FileText size={14} />
            }
            {downloading ? "Generating…" : "Download PDF"}
          </button>
        </div>
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

      {/* ── Delete pet ────────────────────────────────────────────────────── */}
      {confirmDelete ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50 mb-2">
          <p className="text-xs text-rose-700 flex-1">
            Delete {pet.name} and all their data? This can't be undone.
          </p>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeletePet}
            disabled={deleting}
            className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl border border-stone-200/60 bg-[#FFFFFF] text-sm text-rose-400 hover:border-rose-200 hover:text-rose-600 transition-colors active:scale-[0.98] mb-2"
        >
          <Trash2 size={13} />
          Delete {pet.name}
        </button>
      )}
      </div>{/* end right col */}
      </div>{/* end 2-col grid */}
    </div>
  );
}
