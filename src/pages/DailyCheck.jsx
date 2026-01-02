import { useEffect, useMemo, useState } from "react";

const BASE_TASKS = [
  { key: "water", label: "Water" },
  { key: "food", label: "Food" },
  { key: "meds", label: "Medication" },
  { key: "play", label: "Play / Activity" },
];

const SPECIES_TASKS = {
  cat: [{ key: "litter", label: "Litter box" }],
  dog: [{ key: "walk", label: "Walk" }],
};

function todayKey() {
  // YYYY-MM-DD en local time
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function storageKey(petId, dateStr) {
  return `pawtrack:dailycheck:${petId}:${dateStr}`;
}

export default function DailyCheck({ pet, onBack }) {
  const dateStr = todayKey();

  const tasks = useMemo(() => {
    const extra = SPECIES_TASKS[pet?.species] ?? [];
    return [...BASE_TASKS, ...extra];
  }, [pet?.species]);

  const [checked, setChecked] = useState(() => {
    const raw = localStorage.getItem(storageKey(pet?.id, dateStr));
    return raw ? JSON.parse(raw) : {};
  });

  // Si cambias de mascota, recarga su estado
  useEffect(() => {
    const raw = localStorage.getItem(storageKey(pet?.id, dateStr));
    setChecked(raw ? JSON.parse(raw) : {});
  }, [pet?.id, dateStr]);

  // Guarda cada vez que cambie
  useEffect(() => {
    localStorage.setItem(storageKey(pet?.id, dateStr), JSON.stringify(checked));
  }, [checked, pet?.id, dateStr]);

  const completedCount = tasks.filter((t) => checked[t.key]).length;

  function toggle(key) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function reset() {
    setChecked({});
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back
        </button>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Daily Check</h2>
            <p className="text-muted-foreground">
              {pet?.name} · {dateStr} · {completedCount}/{tasks.length} done
            </p>
          </div>

          <button
            onClick={reset}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="space-y-3">
        {tasks.map((t) => (
          <label
            key={t.key}
            className="flex items-center justify-between gap-3 rounded-2xl border p-4 hover:bg-black/5"
          >
            <div className="space-y-0.5">
              <div className="font-semibold">{t.label}</div>
              <div className="text-sm text-muted-foreground">
                {t.key === "meds" ? "Mark if meds were given" : "Mark as completed"}
              </div>
            </div>

            <input
              type="checkbox"
              checked={!!checked[t.key]}
              onChange={() => toggle(t.key)}
              className="h-5 w-5"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
