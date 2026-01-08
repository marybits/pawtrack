import { useEffect, useMemo, useState } from "react";
import { todayKey, loadDailyLog, saveDailyLog } from "../lib/dailyLog";

const BASE_TASKS = [
  { key: "water", label: "Water" },
  { key: "meds", label: "Medication" },
];

const SPECIES_TASKS = {
  cat: [{ key: "litter", label: "Litter box" }],
  dog: [], // walks van como logs (con duración)
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowTimeHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Normaliza data vieja (por si ya tenías logs anteriores)
function normalize(saved) {
  return {
    checked: saved?.checked ?? {},
    notes: saved?.notes ?? "",
    feedings: Array.isArray(saved?.feedings) ? saved.feedings : [],
    walks: Array.isArray(saved?.walks) ? saved.walks : [],
    play: Array.isArray(saved?.play) ? saved.play : [],
  };
}

export default function DailyCheck({ pet, onBack }) {
  const dateStr = todayKey();
  const petId = pet?.id;
  const isDog = pet?.species === "dog";

  const tasks = useMemo(() => {
    const extra = SPECIES_TASKS[pet?.species] ?? [];
    return [...BASE_TASKS, ...extra];
  }, [pet?.species]);

  const [state, setState] = useState(() => normalize(loadDailyLog(petId, dateStr)));

  useEffect(() => {
    setState(normalize(loadDailyLog(petId, dateStr)));
  }, [petId, dateStr]);

  useEffect(() => {
    saveDailyLog(petId, dateStr, state);
  }, [state, petId, dateStr]);

  const completedCount = tasks.filter((t) => !!state.checked?.[t.key]).length;

  function toggle(key) {
    setState((prev) => ({
      ...prev,
      checked: { ...prev.checked, [key]: !prev.checked?.[key] },
    }));
  }

  function resetDay() {
    setState({ checked: {}, notes: "", feedings: [], walks: [], play: [] });
  }

  // ---------------- FEEDINGS ----------------
  function addFeeding() {
    const f = {
      id: uid(),
      time: nowTimeHHMM(),

      // Dry food (cups)
      dryCups: "",

      // Wet food
      wetUnit: "can", // "can" | "tbsp"
      wetAmount: "", // number-ish string
      wetNote: "", // e.g. "half can", "brand"
    };
    setState((p) => ({ ...p, feedings: [f, ...p.feedings] }));
  }

  function updateFeeding(id, patch) {
    setState((p) => ({
      ...p,
      feedings: p.feedings.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }

  function deleteFeeding(id) {
    setState((p) => ({ ...p, feedings: p.feedings.filter((f) => f.id !== id) }));
  }

  // ---------------- PLAY ----------------
  function addPlay() {
    const pl = {
      id: uid(),
      time: nowTimeHHMM(),
      minutes: "",
      notes: "",
    };
    setState((p) => ({ ...p, play: [pl, ...p.play] }));
  }

  function updatePlay(id, patch) {
    setState((p) => ({
      ...p,
      play: p.play.map((pl) => (pl.id === id ? { ...pl, ...patch } : pl)),
    }));
  }

  function deletePlay(id) {
    setState((p) => ({ ...p, play: p.play.filter((pl) => pl.id !== id) }));
  }

  // ---------------- WALKS (dogs) ----------------
  function addWalk() {
    const w = {
      id: uid(),
      time: nowTimeHHMM(),
      durationMin: "",
      pee: false,
      poop: false,
      notes: "",
    };
    setState((p) => ({ ...p, walks: [w, ...p.walks] }));
  }

  function updateWalk(id, patch) {
    setState((p) => ({
      ...p,
      walks: p.walks.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));
  }

  function deleteWalk(id) {
    setState((p) => ({ ...p, walks: p.walks.filter((w) => w.id !== id) }));
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <header className="space-y-2">
        <button onClick={onBack} className="text-sm text-gray-500 hover:underline">
          ← Back
        </button>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Daily Check</h2>
            <p className="text-sm text-gray-500">
              {pet?.name} · {dateStr} · {completedCount}/{tasks.length} checklist done
            </p>
          </div>

          <button
            onClick={resetDay}
            className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Checklist (sí/no) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Checklist</h3>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <ul className="divide-y">
            {tasks.map((t) => (
              <li key={t.key} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-sm text-gray-500">Mark as completed</p>
                </div>

                <input
                  type="checkbox"
                  checked={!!state.checked?.[t.key]}
                  onChange={() => toggle(t.key)}
                  className="h-5 w-5"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Feeding log */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-gray-900">Feeding</h3>
          <button
            onClick={addFeeding}
            className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            + Add feeding
          </button>
        </div>

        {state.feedings.length === 0 ? (
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">
            No feedings logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {state.feedings.map((f) => (
              <div key={f.id} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-full">
                    <label className="text-xs font-medium text-gray-600">Time</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      value={f.time}
                      onChange={(e) => updateFeeding(f.id, { time: e.target.value })}
                      placeholder="HH:MM"
                    />
                  </div>

                  <button
                    onClick={() => deleteFeeding(f.id)}
                    className="text-sm text-gray-500 hover:text-gray-900"
                    title="Delete feeding"
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                {/* Dry food */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Dry food (cups)</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      value={f.dryCups}
                      onChange={(e) => updateFeeding(f.id, { dryCups: e.target.value })}
                      placeholder="e.g. 1/2, 0.75, 1"
                    />
                  </div>

                  {/* Wet unit */}
                  <div>
                    <label className="text-xs font-medium text-gray-600">Wet unit</label>
                    <select
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
                      value={f.wetUnit}
                      onChange={(e) => updateFeeding(f.id, { wetUnit: e.target.value })}
                    >
                      <option value="can">Cans</option>
                      <option value="tbsp">Tablespoons</option>
                    </select>
                  </div>
                </div>

                {/* Wet amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Wet amount ({f.wetUnit === "can" ? "cans" : "tbsp"})
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      value={f.wetAmount}
                      onChange={(e) => updateFeeding(f.id, { wetAmount: e.target.value })}
                      placeholder={f.wetUnit === "can" ? "e.g. 0.5" : "e.g. 2"}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Wet notes</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      value={f.wetNote}
                      onChange={(e) => updateFeeding(f.id, { wetNote: e.target.value })}
                      placeholder="brand, flavor, mixed with water..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Play log */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-gray-900">Play time</h3>
          <button
            onClick={addPlay}
            className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            + Add play
          </button>
        </div>

        {state.play.length === 0 ? (
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">
            No play sessions logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {state.play.map((pl) => (
              <div key={pl.id} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Time</label>
                      <input
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                        value={pl.time}
                        onChange={(e) => updatePlay(pl.id, { time: e.target.value })}
                        placeholder="HH:MM"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600">Minutes</label>
                      <input
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                        value={pl.minutes}
                        onChange={(e) => updatePlay(pl.id, { minutes: e.target.value })}
                        placeholder="e.g. 15"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => deletePlay(pl.id)}
                    className="text-sm text-gray-500 hover:text-gray-900"
                    title="Delete play"
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Notes</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    value={pl.notes}
                    onChange={(e) => updatePlay(pl.id, { notes: e.target.value })}
                    placeholder="toy used, energy level, training..."
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Walks log (dogs only) */}
      {isDog && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-gray-900">Walks</h3>
            <button
              onClick={addWalk}
              className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              + Add walk
            </button>
          </div>

          {state.walks.length === 0 ? (
            <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">
              No walks logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {state.walks.map((w) => (
                <div key={w.id} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Time</label>
                        <input
                          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                          value={w.time}
                          onChange={(e) => updateWalk(w.id, { time: e.target.value })}
                          placeholder="HH:MM"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600">Duration (min)</label>
                        <input
                          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                          value={w.durationMin}
                          onChange={(e) => updateWalk(w.id, { durationMin: e.target.value })}
                          placeholder="e.g. 20"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => deleteWalk(w.id)}
                      className="text-sm text-gray-500 hover:text-gray-900"
                      title="Delete walk"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!w.pee}
                        onChange={() => updateWalk(w.id, { pee: !w.pee })}
                        className="h-4 w-4"
                      />
                      Pee
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!w.poop}
                        onChange={() => updateWalk(w.id, { poop: !w.poop })}
                        className="h-4 w-4"
                      />
                      Poop
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Notes</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      value={w.notes}
                      onChange={(e) => updateWalk(w.id, { notes: e.target.value })}
                      placeholder="behavior, weather, leash issues..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Day notes */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Day Notes</h3>
        <textarea
          value={state.notes}
          onChange={(e) => setState((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Anything important today? (appetite, poop, mood, meds details...)"
          className="min-h-[120px] w-full rounded-2xl border p-4 text-sm outline-none focus:ring-2 focus:ring-black/10"
        />
        <p className="text-xs text-gray-500">Autosaved for this pet & date.</p>
      </section>
    </div>
  );
}
