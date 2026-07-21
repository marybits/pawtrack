import { useState } from "react";
import { CheckCircle, X } from "lucide-react";

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

function toDateTimeLocal(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return toDateTimeLocal(new Date());
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-[#F5F4F7] px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3D3170]/30 focus:border-[#3D3170] transition-colors";

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
            <input value={details.unit   ?? ""} onChange={set("unit")}   placeholder="cup / g"    className={inputClass} />
            <input value={details.food   ?? ""} onChange={set("food")}   placeholder="Food"        className={inputClass} />
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
                ? "bg-[#F0EEF3] border-[#3D3170]/30 text-[#3C2E37]"
                : "border-stone-200 text-stone-500 hover:border-stone-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${details.askedForMore ? "bg-[#3D3170]" : "bg-stone-300"}`} />
            Pet asked for more food
          </button>
        </div>
      );
    }
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
    case "weight":
      return (
        <div className="grid grid-cols-2 gap-2">
          <input value={details.weightKg ?? ""} onChange={set("weightKg")} type="number" min="0" step="0.1" placeholder="Weight" className={inputClass} />
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

/**
 * Shows the Gemini-parsed event as an editable form before the user confirms.
 * Props:
 *   preview   – { type, occurredAt, details, notes }
 *   onConfirm(editedPreview) – called when user clicks "Confirm & Save"
 *   onCancel  – called when user clicks "Cancel"
 *   saving    – boolean, disables confirm button while parent is persisting
 */
export default function EventPreviewCard({ preview, onConfirm, onCancel, saving, species }) {
  const availableTypes = (species ?? "").toLowerCase() === "cat"
    ? EVENT_TYPES
    : EVENT_TYPES.filter((t) => t !== "litter");
  const [type, setType]             = useState(preview.type);
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocal(preview.occurredAt));
  const [details, setDetails]       = useState(preview.details ?? {});
  const [notes, setNotes]           = useState(preview.notes ?? "");

  function handleTypeChange(newType) {
    setType(newType);
    setDetails({});
  }

  function handleConfirm() {
    const ts = new Date(occurredAt);
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
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#3D3170]/25 shadow-sm p-5">
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
            {availableTypes.map((t) => {
              const c = TYPE_CONFIG[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#F0EEF3] border-[#3D3170] text-stone-900"
                      : "bg-[#F5F4F7] text-stone-600 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
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
          className="flex items-center gap-1.5 flex-1 justify-center rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors active:scale-[0.98] duration-150"
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="flex items-center gap-1.5 flex-1 justify-center bg-[#3D3170] hover:bg-[#2E2454] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98] duration-150 disabled:opacity-50"
        >
          <CheckCircle size={14} />
          {saving ? "Saving…" : "Confirm & Save"}
        </button>
      </div>
    </div>
  );
}
