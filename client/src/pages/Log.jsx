import { Plus } from "lucide-react";

// Stub — replaced in Phase 7 (structured form) and Phase 8 (NL input).
export default function Log() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-950 tracking-tight mb-6">
        Log an Event
      </h1>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
          <Plus size={28} strokeWidth={1.5} className="text-stone-400" />
        </div>
        <p className="text-stone-500 text-sm leading-relaxed">
          Select a pet and log what happened — meals, meds, play, and more.
        </p>
      </div>
    </div>
  );
}
