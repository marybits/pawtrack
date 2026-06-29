import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Sparkles, List, SlidersHorizontal, X } from "lucide-react";
import { getPets } from "../api/pets.js";
import { logEvent, getEvents } from "../api/events.js";
import { getPrescriptions } from "../api/prescriptions.js";
import NLEventInput from "../components/NLEventInput.jsx";
import EventPreviewCard from "../components/EventPreviewCard.jsx";

// ── Config ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  meal:       { label: "Meal",       dot: "bg-amber-700"  },
  medication: { label: "Medication", dot: "bg-rose-700"   },
  activity:   { label: "Activity",   dot: "bg-stone-600"  },
  litter:     { label: "Litter",     dot: "bg-stone-400"  },
  poop:       { label: "Poop",       dot: "bg-amber-900"  },
  treats:     { label: "Treats",     dot: "bg-orange-600" },
  weight:     { label: "Weight",     dot: "bg-sky-600"    },
};

const EVENT_TYPES = Object.keys(TYPE_CONFIG);

function toDateTimeLocal(d = new Date()) {
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatOccurredAt(iso) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today at ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` at ${time}`;
}

function summarize(type, details = {}) {
  switch (type) {
    case "meal": return [
      [details.amount, details.unit, details.food].filter(Boolean).join(" "),
      details.finished === "all"     ? "finished all"  :
      details.finished === "partial" ? "left some"     :
      details.finished === "refused" ? "refused"       : null,
      details.askedForMore ? "asked for more" : null,
    ].filter(Boolean).join(" · ");
    case "medication": return [details.name, details.dose, details.unit].filter(Boolean).join(" ");
    case "activity":   return [details.name, details.duration && `${details.duration} ${details.unit || ""}`.trim()].filter(Boolean).join(" · ");
    case "litter":     return details.action || "";
    case "poop":       return [details.consistency, details.color].filter(Boolean).join(", ");
    case "treats":     return [details.name, details.quantity && `×${details.quantity}`].filter(Boolean).join(" ");
    case "weight":     return details.weightKg ? `${details.weightKg} ${details.unit ?? "kg"}` : "";
    default:           return "";
  }
}

// ── Shared input style ─────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-xl border border-stone-200 bg-[#FAF7F0] px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309] transition-colors";

// ── Detail fields per event type ───────────────────────────────────────────
function DetailFields({ type, details, onChange }) {
  function set(field) {
    return (e) => onChange({ ...details, [field]: e.target.value });
  }

  switch (type) {
    case "meal": {
      const FINISHED_OPTS = [
        { value: "all",     label: "Finished all" },
        { value: "partial", label: "Left some"    },
        { value: "refused", label: "Refused"      },
      ];
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <input value={details.amount ?? ""} onChange={set("amount")} type="number" min="0" step="0.1" placeholder="Amount" className={inputClass} />
            <input value={details.unit   ?? ""} onChange={set("unit")}   placeholder="cup / g / can"  className={inputClass} />
            <input value={details.food   ?? ""} onChange={set("food")}   placeholder="Food name"      className={inputClass} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-400 shrink-0">Ate:</span>
            {FINISHED_OPTS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...details, finished: details.finished === value ? undefined : value })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  details.finished === value
                    ? "bg-amber-700 text-white border-amber-700"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...details, askedForMore: !details.askedForMore })}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
              details.askedForMore
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "border-stone-200 text-stone-500 hover:border-stone-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${details.askedForMore ? "bg-amber-500" : "bg-stone-300"}`} />
            Pet asked for more food
          </button>
        </div>
      );
    }
    case "medication":
      return (
        <div className="grid grid-cols-3 gap-2">
          <input value={details.name ?? ""} onChange={set("name")} placeholder="Medication" className={`${inputClass} col-span-1`} />
          <input value={details.dose ?? ""} onChange={set("dose")} type="number" min="0" step="0.1" placeholder="Dose" className={inputClass} />
          <input value={details.unit ?? ""} onChange={set("unit")} placeholder="pill / ml" className={inputClass} />
        </div>
      );
    case "activity":
      return (
        <div className="grid grid-cols-3 gap-2">
          <input value={details.name     ?? ""} onChange={set("name")}     placeholder="Activity"   className={`${inputClass} col-span-1`} />
          <input value={details.duration ?? ""} onChange={set("duration")} type="number" min="0" placeholder="Duration" className={inputClass} />
          <input value={details.unit     ?? ""} onChange={set("unit")}     placeholder="min / hr"   className={inputClass} />
        </div>
      );
    case "litter":
      return (
        <select value={details.action ?? ""} onChange={set("action")} className={inputClass}>
          <option value="">Select action…</option>
          <option value="scooped">Scooped</option>
          <option value="cleaned">Full clean</option>
          <option value="refilled">Refilled litter</option>
        </select>
      );
    case "poop":
      return (
        <div className="grid grid-cols-2 gap-2">
          <select value={details.consistency ?? ""} onChange={set("consistency")} className={inputClass}>
            <option value="">Consistency…</option>
            <option value="normal">Normal</option>
            <option value="loose">Loose</option>
            <option value="solid">Very solid</option>
            <option value="liquid">Liquid</option>
          </select>
          <input value={details.color ?? ""} onChange={set("color")} placeholder="Color" className={inputClass} />
        </div>
      );
    case "treats":
      return (
        <div className="grid grid-cols-2 gap-2">
          <input value={details.name     ?? ""} onChange={set("name")}     placeholder="Treat name" className={inputClass} />
          <input value={details.quantity ?? ""} onChange={set("quantity")} type="number" min="0" placeholder="Qty" className={inputClass} />
        </div>
      );
    case "weight":
      return (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={details.weightKg ?? ""}
            onChange={set("weightKg")}
            type="number"
            min="0"
            step="0.1"
            placeholder="Weight"
            className={inputClass}
          />
          <select value={details.unit ?? "kg"} onChange={set("unit")} className={inputClass}>
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>
        </div>
      );
    default:
      return null;
  }
}

// ── Event item row ─────────────────────────────────────────────────────────
function EventItem({ event }) {
  const cfg = TYPE_CONFIG[event.type];
  const summary = summarize(event.type, event.details);
  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${cfg?.dot ?? "bg-stone-300"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-800 capitalize">{cfg?.label ?? event.type}</p>
        {summary && <p className="text-xs text-stone-500 truncate">{summary}</p>}
        {event.notes && <p className="text-xs text-stone-400 italic truncate">{event.notes}</p>}
      </div>
      <span className="text-xs text-stone-400 shrink-0 pt-0.5">{formatOccurredAt(event.occurredAt)}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Log() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Pet state — pre-select if navigated from Home dashboard
  const [pets, setPets]                   = useState([]);
  const [petsLoading, setPetsLoading]     = useState(true);
  const [selectedPetId, setSelectedPetId] = useState(
    location.state?.preselectedPetId ?? null
  );

  // Mode: "nl" (AI quick log) or "form" (structured form)
  const [mode, setMode] = useState("nl");

  // ── NL / AI state ─────────────────────────────────────────────────────
  const [preview, setPreview] = useState(null);
  const [nlError, setNlError] = useState("");
  const [saving, setSaving]   = useState(false);

  // ── Structured form state ─────────────────────────────────────────────
  const [eventType, setEventType]     = useState(null);
  const [details, setDetails]         = useState({});
  const [notes, setNotes]             = useState("");
  const [occurredAt, setOccurredAt]   = useState(toDateTimeLocal());
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [dateError, setDateError]     = useState("");

  // ── Shared state ──────────────────────────────────────────────────────
  const [success, setSuccess]               = useState(false);
  const [events, setEvents]                 = useState([]);
  const [eventsLoading, setEventsLoading]   = useState(false);
  const [refreshKey, setRefreshKey]         = useState(0);
  const [prescriptions, setPrescriptions]   = useState([]);

  // ── Filter state ──────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType]   = useState("");
  const [filterFrom, setFilterFrom]   = useState("");
  const [filterTo, setFilterTo]       = useState("");

  const activeFilterCount = [filterType, filterFrom, filterTo].filter(Boolean).length;

  function clearFilters() {
    setFilterType("");
    setFilterFrom("");
    setFilterTo("");
  }

  // Load pets once
  useEffect(() => {
    getPets()
      .then((data) => {
        setPets(data);
        if (data.length === 1 && !location.state?.preselectedPetId)
          setSelectedPetId(data[0]._id);
      })
      .catch(console.error)
      .finally(() => setPetsLoading(false));
  }, []);

  // Fetch active prescriptions whenever the selected pet changes
  useEffect(() => {
    if (!selectedPetId) { setPrescriptions([]); return; }
    getPrescriptions(selectedPetId, { activeOnly: true })
      .then(setPrescriptions)
      .catch(console.error);
  }, [selectedPetId]);

  // Load events when pet, filters, or refreshKey changes
  useEffect(() => {
    if (!selectedPetId) return;
    setEventsLoading(true);
    getEvents(selectedPetId, {
      type: filterType || undefined,
      from: filterFrom || undefined,
      to:   filterTo   || undefined,
    })
      .then(setEvents)
      .catch(console.error)
      .finally(() => setEventsLoading(false));
  }, [selectedPetId, refreshKey, filterType, filterFrom, filterTo]);

  function flashSuccess() {
    setSuccess(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSuccess(false), 2500);
  }

  // ── NL handlers ───────────────────────────────────────────────────────
  function handleParsed(parsedPreview) {
    setPreview(parsedPreview);
    setNlError("");
  }

  async function handleConfirmPreview(edited) {
    if (!selectedPetId) return;
    setSaving(true);
    try {
      await logEvent(selectedPetId, edited);
      setPreview(null);
      flashSuccess();
    } catch (err) {
      setNlError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelPreview() {
    setPreview(null);
    setNlError("");
  }

  // ── Structured form handlers ───────────────────────────────────────────
  function pickType(type) {
    setEventType(type);
    setDetails({});
    setError("");
  }

  function handleOccurredAtChange(e) {
    const value = e.target.value;
    setOccurredAt(value);
    if (value && new Date(value) > new Date()) {
      setDateError("The event time can't be in the future — please pick a past or current time.");
    } else {
      setDateError("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPetId) return setError("Select a pet first.");
    if (!eventType)     return setError("Select an event type.");
    if (dateError)      return;
    setError("");
    setSubmitting(true);
    try {
      await logEvent(selectedPetId, {
        type: eventType,
        details,
        notes: notes.trim() || undefined,
        occurredAt: new Date(occurredAt).toISOString(),
      });
      setEventType(null);
      setDetails({});
      setNotes("");
      setOccurredAt(toDateTimeLocal());
      flashSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPet = pets.find((p) => p._id === selectedPetId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-950 tracking-tight mb-6">
        Log an Event
      </h1>

      {/* ── Pet selector ─────────────────────────────────────────────────── */}
      <section className="mb-5">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
          Which pet?
        </p>
        {petsLoading ? (
          <div className="h-9 bg-stone-100 rounded-xl animate-pulse" />
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
          {/* ── Pet context banner ──────────────────────────────────────── */}
          {selectedPet && (
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-[#FFFCF7] border border-amber-200/60 rounded-2xl px-3.5 py-2.5 mb-5">
              <div className="w-7 h-7 rounded-xl bg-[#B45309]/10 flex items-center justify-center shrink-0">
                <span className="text-[#B45309] text-xs font-bold">{selectedPet.name[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-700 leading-none">
                  Logging for <span className="text-[#B45309]">{selectedPet.name}</span>
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5 capitalize">{selectedPet.species}{selectedPet.breed ? ` · ${selectedPet.breed}` : ""}</p>
              </div>
            </div>
          )}

          {/* ── Mode toggle ─────────────────────────────────────────────── */}
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("nl"); setPreview(null); setNlError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === "nl"
                  ? "bg-white text-stone-950 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <Sparkles size={14} strokeWidth={2} className={mode === "nl" ? "text-[#B45309]" : ""} />
              AI Quick Log
            </button>
            <button
              type="button"
              onClick={() => { setMode("form"); setPreview(null); setNlError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === "form"
                  ? "bg-white text-stone-950 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <List size={14} strokeWidth={2} />
              Structured Form
            </button>
          </div>

          {/* ── Success banner ───────────────────────────────────────────── */}
          {success && (
            <div className="mb-4 rounded-xl bg-[#FEF3C7] border border-[#B45309]/30 px-3 py-2.5 text-sm text-[#78350F] flex items-center gap-2">
              <CheckCircle size={16} className="text-[#B45309] shrink-0" />
              Event logged!
            </div>
          )}

          {/* ── NL mode ─────────────────────────────────────────────────── */}
          {mode === "nl" && (
            <section className="mb-8">
              {preview ? (
                <EventPreviewCard
                  preview={preview}
                  onConfirm={handleConfirmPreview}
                  onCancel={handleCancelPreview}
                  saving={saving}
                />
              ) : (
                <NLEventInput
                  petName={selectedPet?.name}
                  onParsed={handleParsed}
                  onError={setNlError}
                  disabled={saving}
                />
              )}
              {nlError && (
                <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                  {nlError}
                </div>
              )}
            </section>
          )}

          {/* ── Structured form mode ─────────────────────────────────────── */}
          {mode === "form" && (
            <form onSubmit={handleSubmit} className="mb-8">

              {/* Event type picker */}
              <section className="mb-5">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                  What happened?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map((type) => {
                    const { label, dot } = TYPE_CONFIG[type];
                    const active = eventType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => pickType(type)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors active:scale-[0.97] duration-150 ${
                          active
                            ? "bg-[#FEF3C7] border-[#B45309] text-stone-900"
                            : "bg-[#FFFCF7] text-stone-600 border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Per-type detail fields */}
              {eventType && (
                <section className="mb-5">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                    Details
                  </p>

                  {/* Prescription quick-select */}
                  {eventType === "medication" && prescriptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {prescriptions.map((rx) => {
                        const active = details.name === rx.medicationName;
                        return (
                          <button
                            key={rx._id}
                            type="button"
                            onClick={() =>
                              setDetails((d) => ({
                                ...d,
                                name: rx.medicationName,
                                ...(rx.dose     != null ? { dose: rx.dose }     : {}),
                                ...(rx.doseUnit         ? { unit: rx.doseUnit } : {}),
                              }))
                            }
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                              active
                                ? "bg-rose-700 text-white border-rose-700"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400"
                            }`}
                          >
                            {rx.medicationName}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <DetailFields type={eventType} details={details} onChange={setDetails} />
                </section>
              )}

              {/* When + Notes */}
              <section className="mb-5 flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                    When?
                  </label>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    max={toDateTimeLocal()}
                    onChange={handleOccurredAtChange}
                    className={`${inputClass} ${dateError ? "border-rose-400 focus:ring-rose-400/30 focus:border-rose-400" : ""}`}
                  />
                  {dateError && (
                    <p className="mt-1.5 text-xs text-rose-600">{dateError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                    Notes <span className="normal-case text-stone-300">(optional)</span>
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything else worth noting…"
                    className={inputClass}
                  />
                </div>
              </section>

              {error && (
                <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !eventType || !!dateError}
                className="w-full bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl px-4 py-3 text-sm font-semibold transition-colors active:scale-[0.98] duration-150 disabled:opacity-40"
              >
                {submitting ? "Saving…" : "Log event"}
              </button>
            </form>
          )}
        </>
      )}

      {/* ── Recent events ─────────────────────────────────────────────────── */}
      {selectedPetId && (
        <section>
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
              {activeFilterCount > 0 ? "Events (filtered)" : "Recent events"}
            </p>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors"
                >
                  <X size={11} /> Clear
                </button>
              )}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors active:scale-[0.97] duration-150 ${
                  showFilters || activeFilterCount > 0
                    ? "bg-[#B45309] text-white border-[#B45309]"
                    : "bg-[#FFFCF7] text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                <SlidersHorizontal size={12} strokeWidth={2} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-white text-[#B45309] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="bg-[#FAF7F0] border border-stone-200/60 rounded-xl p-4 mb-3 flex flex-col gap-3">
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {[{ value: "", label: "All" }, ...EVENT_TYPES.map((t) => ({ value: t, label: TYPE_CONFIG[t].label }))].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilterType(value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        filterType === value
                          ? "bg-[#B45309] text-white border-[#B45309]"
                          : "bg-[#FFFCF7] text-stone-600 border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">From</label>
                  <input
                    type="date"
                    value={filterFrom}
                    max={filterTo || undefined}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">To</label>
                  <input
                    type="date"
                    value={filterTo}
                    min={filterFrom || undefined}
                    onChange={(e) => setFilterTo(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Events list */}
          {eventsLoading ? (
            <div className="space-y-2 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-stone-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">
              {activeFilterCount > 0 ? "No events match these filters." : "No events yet for this pet."}
            </p>
          ) : (
            <div className="bg-[#FFFCF7] rounded-2xl border border-stone-200/60 shadow-sm px-4 divide-y divide-stone-100">
              {(activeFilterCount > 0 ? events.slice(0, 50) : events.slice(0, 10)).map((ev) => (
                <EventItem key={ev._id} event={ev} />
              ))}
            </div>
          )}

          {events.length > (activeFilterCount > 0 ? 50 : 10) && (
            <p className="text-xs text-stone-400 text-center mt-2">
              Showing {activeFilterCount > 0 ? 50 : 10} of {events.length} events
            </p>
          )}
        </section>
      )}
    </div>
  );
}
