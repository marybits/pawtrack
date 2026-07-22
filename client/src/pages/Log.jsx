import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Sparkles, List, SlidersHorizontal, X, ChevronDown, ChevronRight, Pencil, Trash2, Check } from "lucide-react";
import { getPets } from "../api/pets.js";
import { logEvent, getEvents, updateEvent, deleteEvent } from "../api/events.js";
import { getPrescriptions } from "../api/prescriptions.js";
import NLEventInput from "../components/NLEventInput.jsx";
import EventPreviewCard from "../components/EventPreviewCard.jsx";
import DetailFields, { inputClass } from "../components/DetailFields.jsx";

// ── Config ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  meal:       { label: "Meal",       dot: "bg-amber-700"  },
  medication: { label: "Medication", dot: "bg-rose-700"   },
  activity:   { label: "Activity",   dot: "bg-stone-600"  },
  litter:     { label: "Litter",     dot: "bg-stone-400"  },
  poop:       { label: "Poop",       dot: "bg-amber-900"  },
  treats:     { label: "Treats",     dot: "bg-orange-600" },
  weight:     { label: "Weight",     dot: "bg-[#A690A4]"    },
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

// ── Event item row (with edit + delete) ────────────────────────────────────
function EventItem({ event, petId, onUpdated, onDeleted }) {
  const cfg = TYPE_CONFIG[event.type];
  const summary = summarize(event.type, event.details);

  const [mode, setMode]         = useState(null); // null | "edit" | "confirm-delete"
  const [editDetails, setEditDetails] = useState({});
  const [editNotes, setEditNotes]     = useState("");
  const [editTime, setEditTime]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState(null);

  function openEdit() {
    setEditDetails({ ...(event.details ?? {}) });
    setEditNotes(event.notes ?? "");
    // format occurredAt for datetime-local input
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
          <span className="text-xs font-semibold text-[#3D3170] capitalize">{cfg?.label ?? event.type}</span>
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
        <p className="text-xs text-stone-600 flex-1">Delete this {cfg?.label ?? event.type} event?</p>
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
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${cfg?.dot ?? "bg-stone-300"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-800 capitalize">{cfg?.label ?? event.type}</p>
        {summary && <p className="text-xs text-stone-500 truncate">{summary}</p>}
        {event.notes && <p className="text-xs text-stone-400 italic truncate">{event.notes}</p>}
      </div>
      <span className="text-xs text-stone-400 shrink-0 pt-0.5 mr-1">{formatOccurredAt(event.occurredAt)}</span>
      {/* action buttons — visible on hover (desktop) or always on touch */}
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

  // ── Prescription quick-confirm state ──────────────────────────────────
  // rxConfirm: null | { rx, occurredAt, notes } — drives the confirm step
  // manualMed: fallback flag to show manual fields when cards are available
  const [rxConfirm, setRxConfirm]   = useState(null);
  const [manualMed, setManualMed]   = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [eventsOpen, setEventsOpen]   = useState(false);
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

  // ── Prescription confirm handlers ─────────────────────────────────────
  async function handleRxConfirm() {
    if (!selectedPetId || !rxConfirm) return;
    if (new Date(rxConfirm.occurredAt) > new Date()) {
      setError("The event time can't be in the future.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { rx } = rxConfirm;
      await logEvent(selectedPetId, {
        type: "medication",
        details: {
          name: rx.medicationName,
          ...(rx.dose != null ? { dose: rx.dose }   : {}),
          ...(rx.doseUnit     ? { unit: rx.doseUnit } : {}),
        },
        notes: rxConfirm.notes.trim() || undefined,
        occurredAt: new Date(rxConfirm.occurredAt).toISOString(),
      });
      setRxConfirm(null);
      setEventType(null);
      setManualMed(false);
      flashSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleRxCancel() {
    setRxConfirm(null);
  }

  // ── Structured form handlers ───────────────────────────────────────────
  function pickType(type) {
    setEventType(type);
    setDetails({});
    setError("");
    setRxConfirm(null);
    setManualMed(false);
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

  const selectedPet    = pets.find((p) => p._id === selectedPetId);
  const availableTypes = selectedPet?.species === "cat"
    ? EVENT_TYPES
    : EVENT_TYPES.filter((t) => t !== "litter");

  // Active prescriptions: active flag + within date range
  const now = new Date();
  const activePrescriptions = prescriptions.filter((rx) => {
    const start = new Date(rx.startDate);
    const end   = rx.endDate ? new Date(rx.endDate) : null;
    return start <= now && (end === null || end >= now);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-950 tracking-tight mb-6">
        Log an Event
      </h1>

      {/* ── Pet selector ─────────────────────────────────────────────────── */}
      <section className="mb-5">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-2">
          Which pet?
        </p>
        {petsLoading ? (
          <div className="h-9 bg-stone-100 rounded-xl animate-pulse" />
        ) : pets.length === 0 ? (
          <p className="text-sm text-stone-500">
            No pets yet.{" "}
            <button
              onClick={() => navigate("/pets")}
              className="text-[#3D3170] font-semibold hover:text-[#2E2454] transition-colors"
            >
              Register one first →
            </button>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pets.map((pet) => (
              <button
                key={pet._id}
                onClick={() => {
                  setSelectedPetId(pet._id);
                  if (pet.species !== "cat" && eventType === "litter") setEventType("");
                  setRxConfirm(null);
                  setManualMed(false);
                }}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors active:scale-[0.97] duration-150 ${
                  selectedPetId === pet._id
                    ? "bg-[#3D3170] text-white border-[#3D3170]"
                    : "bg-[#FFFFFF] text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                {pet.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedPetId && (
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
          {/* ── Left col: form area ──────────────────────────────────────── */}
          <div>
          {/* ── Pet context banner ──────────────────────────────────────── */}
          {selectedPet && (
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-[#F0EEF3] to-[#FFFFFF] border border-[#E2E0EB]/60 rounded-2xl px-3.5 py-2.5 mb-5">
              <div className="w-7 h-7 rounded-xl bg-[#3D3170]/10 flex items-center justify-center shrink-0">
                <span className="text-[#3D3170] text-xs font-bold">{selectedPet.name[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-700 leading-none">
                  Logging for <span className="text-[#3D3170]">{selectedPet.name}</span>
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
              <Sparkles size={14} strokeWidth={2} className={mode === "nl" ? "text-[#3D3170]" : ""} />
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
            <div className="mb-4 rounded-xl bg-[#F0EEF3] border border-[#3D3170]/30 px-3 py-2.5 text-sm text-[#3C2E37] flex items-center gap-2">
              <CheckCircle size={16} className="text-[#3D3170] shrink-0" />
              Event logged!
            </div>
          )}

          {/* ── NL mode ─────────────────────────────────────────────────── */}
          {mode === "nl" && (
            <section className="mb-8">
              {rxConfirm ? (
                /* ── Rx quick-confirm (NL path) ──────────────────────── */
                <div className="rounded-2xl border border-rose-200 bg-[#FDF6F7] p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-rose-700 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800">{rxConfirm.rx.medicationName}</p>
                      {(rxConfirm.rx.dose != null || rxConfirm.rx.doseUnit) && (
                        <p className="text-xs text-stone-500">
                          {[rxConfirm.rx.dose, rxConfirm.rx.doseUnit].filter((v) => v != null && v !== "").join(" ")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRxCancel}
                      className="text-xs text-stone-400 hover:text-stone-600 transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-1.5">
                      When?
                    </label>
                    <input
                      type="datetime-local"
                      value={rxConfirm.occurredAt}
                      max={toDateTimeLocal()}
                      onChange={(e) => setRxConfirm((s) => ({ ...s, occurredAt: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-1.5">
                      Notes <span className="normal-case text-stone-300">(optional)</span>
                    </label>
                    <input
                      value={rxConfirm.notes}
                      onChange={(e) => setRxConfirm((s) => ({ ...s, notes: e.target.value }))}
                      placeholder="Anything else worth noting…"
                      className={inputClass}
                    />
                  </div>
                  {error && (
                    <div className="rounded-xl bg-rose-100 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRxConfirm}
                    disabled={submitting}
                    className="w-full bg-rose-700 hover:bg-rose-800 text-white rounded-xl px-4 py-3 text-sm font-semibold transition-colors active:scale-[0.98] duration-150 disabled:opacity-40"
                  >
                    {submitting ? "Saving…" : "Confirm & Save"}
                  </button>
                </div>
              ) : preview ? (
                <EventPreviewCard
                  preview={preview}
                  onConfirm={handleConfirmPreview}
                  onCancel={handleCancelPreview}
                  saving={saving}
                  species={selectedPet?.species}
                />
              ) : (
                <>
                  <NLEventInput
                    petName={selectedPet?.name}
                    species={selectedPet?.species}
                    onParsed={handleParsed}
                    onError={setNlError}
                    disabled={saving}
                  />
                  {/* ── Prescription quick-log chips ─────────────────── */}
                  {activePrescriptions.length > 0 && (
                    <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
                      <span className="text-xs text-stone-400 shrink-0">Quick log:</span>
                      {activePrescriptions.map((rx) => (
                        <button
                          key={rx._id}
                          type="button"
                          onClick={() => setRxConfirm({ rx, occurredAt: toDateTimeLocal(), notes: "" })}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-colors active:scale-[0.97] duration-150"
                        >
                          {rx.medicationName}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {!rxConfirm && nlError && (
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
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-2">
                  What happened?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {availableTypes.map((type) => {
                    const { label, dot } = TYPE_CONFIG[type];
                    const active = eventType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => pickType(type)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors active:scale-[0.97] duration-150 ${
                          active
                            ? "bg-[#F0EEF3] border-[#3D3170] text-stone-900"
                            : "bg-[#FFFFFF] text-stone-600 border-stone-200 hover:border-stone-300"
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
              {eventType && !rxConfirm && (
                <section className="mb-5">
                  {eventType === "medication" && activePrescriptions.length > 0 && !manualMed ? (
                    /* ── Prescription card picker ─────────────────────── */
                    <>
                      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-2">
                        Active prescriptions
                      </p>
                      <div className="flex flex-col gap-2">
                        {activePrescriptions.map((rx) => (
                          <button
                            key={rx._id}
                            type="button"
                            onClick={() => setRxConfirm({ rx, occurredAt: toDateTimeLocal(), notes: "" })}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 text-left transition-colors active:scale-[0.98] duration-150"
                          >
                            <span className="w-2 h-2 rounded-full bg-rose-700 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-stone-800">{rx.medicationName}</p>
                              {(rx.dose != null || rx.doseUnit) && (
                                <p className="text-xs text-stone-500">
                                  {[rx.dose, rx.doseUnit].filter((v) => v != null && v !== "").join(" ")}
                                </p>
                              )}
                            </div>
                            <ChevronRight size={14} className="text-rose-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualMed(true)}
                        className="mt-2.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        Log a one-off medication instead →
                      </button>
                    </>
                  ) : (
                    /* ── Standard detail fields ───────────────────────── */
                    <>
                      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-2">
                        Details
                      </p>
                      <DetailFields type={eventType} details={details} onChange={setDetails} />
                    </>
                  )}
                </section>
              )}

              {/* ── Rx quick-confirm ─────────────────────────────────────── */}
              {rxConfirm && (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-[#FDF6F7] p-4 flex flex-col gap-4">
                  {/* Medication header */}
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-rose-700 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800">{rxConfirm.rx.medicationName}</p>
                      {(rxConfirm.rx.dose != null || rxConfirm.rx.doseUnit) && (
                        <p className="text-xs text-stone-500">
                          {[rxConfirm.rx.dose, rxConfirm.rx.doseUnit].filter((v) => v != null && v !== "").join(" ")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRxCancel}
                      className="text-xs text-stone-400 hover:text-stone-600 transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>
                  {/* When */}
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-1.5">
                      When?
                    </label>
                    <input
                      type="datetime-local"
                      value={rxConfirm.occurredAt}
                      max={toDateTimeLocal()}
                      onChange={(e) => setRxConfirm((s) => ({ ...s, occurredAt: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-1.5">
                      Notes <span className="normal-case text-stone-300">(optional)</span>
                    </label>
                    <input
                      value={rxConfirm.notes}
                      onChange={(e) => setRxConfirm((s) => ({ ...s, notes: e.target.value }))}
                      placeholder="Anything else worth noting…"
                      className={inputClass}
                    />
                  </div>
                  {error && (
                    <div className="rounded-xl bg-rose-100 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRxConfirm}
                    disabled={submitting}
                    className="w-full bg-rose-700 hover:bg-rose-800 text-white rounded-xl px-4 py-3 text-sm font-semibold transition-colors active:scale-[0.98] duration-150 disabled:opacity-40"
                  >
                    {submitting ? "Saving…" : "Confirm & Save"}
                  </button>
                </div>
              )}

              {/* When + Notes + submit — hidden when the Rx confirm card is showing */}
              {!rxConfirm && (
                <>
                  <section className="mb-5 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-2">
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
                      <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-2">
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
                    className="w-full bg-[#3D3170] hover:bg-[#2E2454] text-white rounded-xl px-4 py-3 text-sm font-semibold transition-colors active:scale-[0.98] duration-150 disabled:opacity-40"
                  >
                    {submitting ? "Saving…" : "Log event"}
                  </button>
                </>
              )}
            </form>
          )}
          </div>{/* end form area */}

          {/* ── Right col: recent events (collapsible) ───────────────────── */}
          <section className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">

            {/* ── Toggle header ──────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-3">
              {/* Clickable title + count + chevron */}
              <button
                onClick={() => setEventsOpen((v) => !v)}
                className="flex-1 flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#3D3170] shrink-0" />
                <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.08em] flex-1">
                  {activeFilterCount > 0 ? "Events (filtered)" : "Recent events"}
                </p>
                {!eventsLoading && events.length > 0 && (
                  <span className="text-xs text-stone-400 mr-1">{events.length} logged</span>
                )}
                <ChevronDown
                  size={14}
                  className={`text-stone-400 transition-transform duration-200 ${eventsOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Filter button — always visible so users can search while closed */}
              <div className="flex items-center gap-1.5 shrink-0">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors"
                  >
                    <X size={11} /> Clear
                  </button>
                )}
                <button
                  onClick={() => { setShowFilters((v) => !v); setEventsOpen(true); }}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors active:scale-[0.97] duration-150 ${
                    showFilters || activeFilterCount > 0
                      ? "bg-[#3D3170] text-white border-[#3D3170]"
                      : "bg-[#FFFFFF] text-stone-600 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <SlidersHorizontal size={12} strokeWidth={2} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-white text-[#3D3170] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ── Collapsible body ───────────────────────────────────────── */}
            {eventsOpen && (
              <div className="px-4 pb-4 border-t border-stone-100">

                {/* Filter panel */}
                {showFilters && (
                  <div className="bg-[#F5F4F7] border border-stone-200/60 rounded-xl p-4 mt-3 mb-3 flex flex-col gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-2">Type</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[{ value: "", label: "All" }, ...availableTypes.map((t) => ({ value: t, label: TYPE_CONFIG[t].label }))].map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFilterType(value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                              filterType === value
                                ? "bg-[#3D3170] text-white border-[#3D3170]"
                                : "bg-[#FFFFFF] text-stone-600 border-stone-200 hover:border-stone-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-1">From</label>
                        <input
                          type="date"
                          value={filterFrom}
                          max={filterTo || undefined}
                          onChange={(e) => setFilterFrom(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-1">To</label>
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
                  <div className="space-y-2 pt-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-stone-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <p className="text-sm text-stone-400 py-4 text-center">
                    {activeFilterCount > 0 ? "No events match these filters." : "No events yet for this pet."}
                  </p>
                ) : (
                  <div className="bg-[#F5F4F7] rounded-2xl mt-3 px-4 divide-y divide-stone-200/60">
                    {(activeFilterCount > 0 ? events.slice(0, 50) : events.slice(0, 10)).map((ev) => (
                      <EventItem
                        key={ev._id}
                        event={ev}
                        petId={selectedPetId}
                        onUpdated={(updated) => setEvents((prev) => prev.map((e) => e._id === updated._id ? updated : e))}
                        onDeleted={(id) => setEvents((prev) => prev.filter((e) => e._id !== id))}
                      />
                    ))}
                  </div>
                )}

                {events.length > (activeFilterCount > 0 ? 50 : 10) && (
                  <p className="text-xs text-stone-400 text-center mt-2">
                    Showing {activeFilterCount > 0 ? 50 : 10} of {events.length} events
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
