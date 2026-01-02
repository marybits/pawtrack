import { useEffect, useMemo, useState } from "react";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function storageKey(petId, dateStr) {
  return `pawtrack:nutrition:${petId}:${dateStr}`;
}

function nowTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatTime24To12(t) {
  // "14:05" -> "2:05 PM"
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const m = mStr;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export default function Nutrition({ pet, onBack }) {
  const dateStr = todayKey();
  const key = storageKey(pet?.id, dateStr);

  const [meals, setMeals] = useState(() => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    const raw = localStorage.getItem(key);
    setMeals(raw ? JSON.parse(raw) : []);
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(meals));
  }, [key, meals]);

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    time: nowTime(),
    amount: "",
    unit: "g",
    foodType: "dry", // dry | wet | treat | other
    notes: "",
  });

  const sortedMeals = useMemo(() => {
    return [...meals].sort((a, b) => (a.time > b.time ? 1 : -1));
  }, [meals]);

  function openAdd() {
    setForm({
      time: nowTime(),
      amount: "",
      unit: "g",
      foodType: "dry",
      notes: "",
    });
    setIsAdding(true);
  }

  function closeAdd() {
    setIsAdding(false);
  }

  function addMeal(e) {
    e.preventDefault();

    const amountNum = Number(form.amount);
    if (!form.time) return;
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) return;

    const newMeal = {
      id: crypto?.randomUUID?.() ?? `m_${Date.now()}`,
      time: form.time,
      amount: amountNum,
      unit: form.unit,
      foodType: form.foodType,
      notes: form.notes.trim(),
    };

    setMeals((prev) => [...prev, newMeal]);
    setIsAdding(false);
  }

  function deleteMeal(id) {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }

  const total = useMemo(() => {
    // Solo suma si la unidad coincide (ej: todos en g o todos en cups)
    if (meals.length === 0) return null;
    const unit = meals[0].unit;
    const sameUnit = meals.every((m) => m.unit === unit);
    if (!sameUnit) return null;
    const sum = meals.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
    return { sum, unit };
  }, [meals]);

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
            <h2 className="text-2xl font-bold">Nutrition</h2>
            <p className="text-muted-foreground">
              {pet?.name} · {dateStr}
              {total ? ` · Total: ${total.sum} ${total.unit}` : ""}
            </p>
          </div>

          <button
            onClick={openAdd}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            + Add meal
          </button>
        </div>
      </header>

      {/* Add meal panel */}
      {isAdding && (
        <form onSubmit={addMeal} className="rounded-2xl border p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Amount</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="e.g. 80"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2"
              >
                <option value="g">g</option>
                <option value="cups">cups</option>
                <option value="ml">ml</option>
                <option value="oz">oz</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <select
                value={form.foodType}
                onChange={(e) => setForm((p) => ({ ...p, foodType: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2"
              >
                <option value="dry">Dry</option>
                <option value="wet">Wet</option>
                <option value="treat">Treat</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notes (optional)</label>
            <input
              type="text"
              placeholder="e.g. new kibble brand, ate slowly..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeAdd}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-black/5"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Meals list */}
      <div className="space-y-3">
        {sortedMeals.length === 0 ? (
          <div className="rounded-2xl border p-6 text-muted-foreground">
            No meals logged yet. Add the first one ✨
          </div>
        ) : (
          sortedMeals.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border p-4 flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="font-semibold">
                  {formatTime24To12(m.time)} · {m.amount} {m.unit}
                </div>
                <div className="text-sm text-muted-foreground">
                  Type: {m.foodType}
                </div>
                {m.notes ? (
                  <div className="text-sm text-muted-foreground">{m.notes}</div>
                ) : null}
              </div>

              <button
                onClick={() => deleteMeal(m.id)}
                className="text-sm text-muted-foreground hover:underline"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
