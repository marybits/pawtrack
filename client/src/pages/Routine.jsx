import { BarChart3 } from "lucide-react";

// Stub — replaced in Phase 10 with stacked bar, donut, and streak charts.
export default function Routine() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-950 tracking-tight mb-6">
        Routine
      </h1>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
          <BarChart3 size={28} strokeWidth={1.5} className="text-stone-400" />
        </div>
        <p className="text-stone-500 text-sm leading-relaxed">
          Log events for 3+ days to unlock analytics for your pet.
        </p>
      </div>
    </div>
  );
}
