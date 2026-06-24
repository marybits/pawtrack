import { PawPrint } from "lucide-react";

// Stub — replaced in Phase 6 with real pet list + register form.
export default function Pets() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-950 tracking-tight mb-6">
        Your Pets
      </h1>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
          <PawPrint size={28} strokeWidth={1.5} className="text-stone-400" />
        </div>
        <p className="text-stone-500 text-sm leading-relaxed">
          No pets yet — register your first pet below.
        </p>
      </div>
    </div>
  );
}
