import { useState } from "react";
import { CheckCircle, X } from "lucide-react";

const TYPE_CONFIG = {
  meal:       { label: "Meal",       dot: "bg-amber-700"  },
  medication: { label: "Medication", dot: "bg-rose-700"   },
  activity:   { label: "Activity",   dot: "bg-stone-600"  },
  litter:     { label: "Litter",     dot: "bg-stone-400"  },
  poop:       { label: "Poop",       dot: "bg-amber-900"  },
  treats:     { label: "Treats",     dot: "bg-orange-600" },
};

const EVENT_TYPES = Object.keys(TYPE_CONFIG);

function toDateTimeLocal(iso) {
  const d = new Date(iso);
  // Guard against invalid dates (e.g. Gemini returning a malformed occurredAt).
  if (isNaN(d.getTime())) return toDateTimeLocal(new Date());
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const inputClass =
  "w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent bg-white";

function DetailFields({ type, details, onChange }) {
  function set(field) {
    return (e) => onChange({ ...details, [field]: e.target.value });
  }
  switch (type) {
    case "meal":
      return (
        <div className="grid grid-cols-3 gap-2">
          <input value={details.amount ?? ""} onChange={set("amount")} type="number" min="0" step="0.1" placeholder="Amount" className={inputClass} />
          <input value={details.unit   ?? ""} onChange={set("unit")}   placeholder="cup / g"    className={inputClass} />
          <input value={details.food   ?? ""} onChange={set("food")}   placeholder="Food"        className={inputClass} />
        </div>
      );
    case "medication":
      return (
        <div className="grid grid-cols-3 gap-2">
          <input value={details.name ?? ""} onChange={set("name")} placeholder="Name"       className={inputClass} />
          <input value={details.dose ?? ""} onChange={set("dose")} type="number" min="0" step="0.1" placeholder="Dose" className={inputClass} />
          <input value={details.unit ?? ""} onChange={set("unit")} placeholder="pill / ml"  className={inputClass} />
        </div>
      );
    case "activity":
      return (
        <div className="grid grid-cols-3 gap-2">
          <input value={details.name     ?? ""} onChange={set("name")}     placeholder="Activity"  className={inputClass} />
          <input value={details.duration ?? ""} onChange={set("duration")} type="number" min="0" placeholder="Duration" className={inputClass} />
          <input value={details.unit     ?? ""} onChange={set("unit")}     placeholder="min / hr"  className={inputClass} />
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

/**
 * Shows the Gemini-parsed event as an editable form before the user confirms.
 * Props:
 *   preview   – { type, occurredAt, details, notes }
 *   onConfirm(editedPreview) – called when user clicks "Confirm & Save"
 *   onCancel  – called when user clicks "Cancel"
 *   saving    – boolean, disables confirm button while parent is persisting
 */
export default function EventPreviewCard({ preview, onConfirm, onCancel, saving }) {
  const [type, setType]           = useState(preview.type);
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocal(preview.occurredAt));
  const [details, setDetails]     = useState(preview.details ?? {});
  const [notes, setNotes]         = useState(preview.notes ?? "");

  function handleTypeChange(newType) {
    setType(newType);
    setDetails({});
  }

  function handleConfirm() {
    const ts = new Date(occurredAt);
    // Guard: if the user cleared the field, fall back to now.
    const safeOccurredAt = isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString();
    onConfirm({
      type,
      occurredAt: safeOccurredAt,
      details,
      notes: notes.trim() || undefined,
    });
  }

  const cfg = TYPE_CONFIG[type];

  return (
    <div className="bg-stone-50 rounded-xl border-2 border-stone-300 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg?.dot ?? "bg-stone-400"}`} />
        <p className="text-sm font-semibold text-stone-800">AI preview — review &amp; edit before saving</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Type selector */}
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Event type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((t) => {
              const c = TYPE_CONFIG[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    type === t
                      ? "bg-stone-950 text-white border-stone-950"
                      : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${type === t ? "bg-white opacity-80" : c.dot}`} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Details */}
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Details
          </label>
          <DetailFields type={type} details={details} onChange={setDetails} />
        </div>

        {/* When */}
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            When
          </label>
          <input
            type="datetime-local"
            value={occurredAt}
            max={toDateTimeLocal(new Date())}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Notes <span className="normal-case text-stone-300">(optional)</span>
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes…"
            className={inputClass}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 flex-1 justify-center rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="flex items-center gap-1.5 flex-1 justify-center bg-stone-950 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          <CheckCircle size={14} />
          {saving ? "Saving…" : "Confirm & Save"}
        </button>
      </div>
    </div>
  );
}
