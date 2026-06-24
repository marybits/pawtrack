import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { getPets } from "../api/pets.js";
import { logEvent, getEvents } from "../api/events.js";

// ── Config ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  meal:       { label: "Meal",       dot: "bg-amber-700"  },
  medication: { label: "Medication", dot: "bg-rose-700"   },
  activity:   { label: "Activity",   dot: "bg-stone-600"  },
  litter:     { label: "Litter",     dot: "bg-stone-400"  },
  poop:       { label: "Poop",       dot: "bg-amber-900"  },
  treats:     { label: "Treats",     dot: "bg-orange-600" },
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
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` at ${time}`
  );
}

function summarize(type, details = {}) {
  switch (type) {
    case "meal":       return [details.amount, details.unit, details.food].filter(Boolean).join(" ");
    case "medication": return [details.name, details.dose, details.unit].filter(Boolean).join(" ");
    case "activity":   return [details.name, details.duration && `${details.duration} ${details.unit || ""}`.trim()].filter(Boolean).join(" · ");
    case "litter":     return details.action || "";
    case "poop":       return [details.consistency, details.color].filter(Boolean).join(", ");
    case "treats":     return [details.name, details.quantity && `×${details.quantity}`].filter(Boolean).join(" ");
    default:           return "";
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent";

function DetailFields({ type, details, onChange }) {
  function set(field) {
    return (e) => onChange({ ...details, [field]: e.target.value });
  }

  switch (type) {
    case "meal":
      return (
        <div className="grid grid-cols-3 gap-2">
          <input value={details.amount ?? ""} onChange={set("amount")} type="number" min="0" step="0.1" placeholder="Amount" className={inputClass} />
          <input value={details.unit   ?? ""} onChange={set("unit")}   placeholder="cup / g / can"  className={inputClass} />
          <input value={details.food   ?? ""} onChange={set("food")}   placeholder="Food name"      className={inputClass} />
        </div>
      );
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
    default:
      return null;
  }
}

function EventItem({ event }) {
  const cfg = TYPE_CONFIG[event.type];
  const summary = summarize(event.type, event.details);
  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${cfg?.dot ?? "bg-stone-300"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-800 capitalize">{cfg?.label ?? event.type}</p>
        {summary && <p className="text-xs text-stone-500 truncate">{summary}</p>}
        {event.notes && <p className="text-xs text-stone-400 italic truncate">{event.notes}</p>}
      </div>
      <span className="text-xs text-stone-400 shrink-0">{formatOccurredAt(event.occurredAt)}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Log() {
  const navigate = useNavigate();

  const [pets, setPets]               = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState(null);

  const [eventType, setEventType] = useState(null);
  const [details, setDetails]     = useState({});
  const [notes, setNotes]         = useState("");
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocal());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [dateError, setDateError]   = useState("");
  const [success, setSuccess]       = useState(false);

  const [events, setEvents]         = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load pets once on mount
  useEffect(() => {
    getPets()
      .then((data) => { setPets(data); if (data.length === 1) setSelectedPetId(data[0]._id); })
      .catch(console.error)
      .finally(() => setPetsLoading(false));
  }, []);

  // Load events whenever pet or refresh key changes
  useEffect(() => {
    if (!selectedPetId) return;
    setEventsLoading(true);
    getEvents(selectedPetId)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setEventsLoading(false));
  }, [selectedPetId, refreshKey]);

  // Reset detail fields when type changes
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
      // Reset form, flash success, refresh list
      setEventType(null);
      setDetails({});
      setNotes("");
      setOccurredAt(toDateTimeLocal());
      setSuccess(true);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-950 tracking-tight mb-6">
        Log an Event
      </h1>

      {/* ── Pet selector ─────────────────────────────────────────────────── */}
      <section className="mb-5">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
          Which pet?
        </p>
        {petsLoading ? (
          <div className="h-9 bg-stone-100 rounded-lg animate-pulse" />
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
        <form onSubmit={handleSubmit}>
          {/* ── Event type picker ─────────────────────────────────────────── */}
          <section className="mb-5">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      active
                        ? "bg-stone-950 text-white border-stone-950"
                        : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-white opacity-80" : dot}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Per-type detail fields ────────────────────────────────────── */}
          {eventType && (
            <section className="mb-5">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                Details
              </p>
              <DetailFields type={eventType} details={details} onChange={setDetails} />
            </section>
          )}

          {/* ── When + Notes ──────────────────────────────────────────────── */}
          <section className="mb-5 flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                When?
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                max={toDateTimeLocal()}
                onChange={handleOccurredAtChange}
                className={`${inputClass} ${dateError ? "border-rose-400 focus:ring-rose-400" : ""}`}
              />
              {dateError && (
                <p className="mt-1.5 text-xs text-rose-600">{dateError}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
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

          {/* ── Error / Success ───────────────────────────────────────────── */}
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2.5 text-sm text-stone-700 flex items-center gap-2">
              <CheckCircle size={16} className="text-stone-500 shrink-0" />
              Event logged!
            </div>
          )}

          {/* ── Submit ───────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting || !eventType}
            className="w-full bg-stone-950 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-40 mb-8"
          >
            {submitting ? "Saving…" : "Log event"}
          </button>
        </form>
      )}

      {/* ── Recent events ─────────────────────────────────────────────────── */}
      {selectedPetId && (
        <section>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
            Recent events
          </p>
          {eventsLoading ? (
            <div className="space-y-3 pt-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-stone-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">
              No events yet for this pet.
            </p>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 px-4 divide-y divide-stone-100">
              {events.slice(0, 10).map((ev) => (
                <EventItem key={ev._id} event={ev} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
