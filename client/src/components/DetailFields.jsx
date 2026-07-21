// ── Shared input style ─────────────────────────────────────────────────────
export const inputClass =
  "w-full rounded-xl border border-stone-200 bg-[#F5F4F7] px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3D3170]/30 focus:border-[#3D3170] transition-colors";

// ── Per-type detail fields ─────────────────────────────────────────────────
export default function DetailFields({ type, details, onChange }) {
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
