import { useEffect, useMemo, useState } from "react";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function medsKey(petId) {
  return `pawtrack:meds:${petId}`;
}

function dailyCheckKey(petId, dateStr) {
  return `pawtrack:medscheck:${petId}:${dateStr}`;
}

const TIMES = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "night", label: "Night" },
];

export default function VetAndMeds({ pet, onBack }) {
  const dateStr = todayKey();

  // --- Active meds list (persists across days)
  const [meds, setMeds] = useState(() => {
    const raw = localStorage.getItem(medsKey(pet?.id));
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    const raw = localStorage.getItem(medsKey(pet?.id));
    setMeds(raw ? JSON.parse(raw) : []);
  }, [pet?.id]);

  useEffect(() => {
    localStorage.setItem(medsKey(pet?.id), JSON.stringify(meds));
  }, [pet?.id, meds]);

  // --- Daily checkbox state for meds (per day)
  const [given, setGiven] = useState(() => {
    const raw = localStorage.getItem(dailyCheckKey(pet?.id, dateStr));
    return raw ? JSON.parse(raw) : {};
  });

  useEffect(() => {
    const raw = localStorage.getItem(dailyCheckKey(pet?.id, dateStr));
    setGiven(raw ? JSON.parse(raw) : {});
  }, [pet?.id, dateStr]);

  useEffect(() => {
    localStorage.setItem(dailyCheckKey(pet?.id, dateStr), JSON.stringify(given));
  }, [pet?.id, dateStr, given]);

  // --- Add med form
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dose: "",
    notes: "",
    schedule: { morning: true, afternoon: false, night: false },
  });

  function openAdd() {
    setForm({
      name: "",
      dose: "",
      notes: "",
      schedule: { morning: true, afternoon: false, night: false },
    });
    setIsAdding(true);
  }

  function closeAdd() {
    setIsAdding(false);
  }

  function addMed(e) {
    e.preventDefault();
    const name = form.name.trim();
    const dose = form.dose.trim();
    const notes = form.notes.trim();

    if (!name) return;
    const hasAnyTime = Object.values(form.schedule).some(Boolean);
    if (!hasAnyTime) return;

    const newMed = {
      id: crypto?.randomUUID?.() ?? `med_${Date.now()}`,
      name,
      dose,
      notes,
      schedule: form.schedule,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setMeds((prev) => [...prev, newMed]);
    setIsAdding(false);
  }

  function toggleActive(medId) {
    setMeds((prev) =>
      prev.map((m) => (m.id === medId ? { ...m, isActive: !m.isActive } : m))
    );
  }

  function deleteMed(medId) {
    setMeds((prev) => prev.filter((m) => m.id !== medId));
    // limpia checks diarios para ese med (de hoy)
    setGiven((prev) => {
      const copy = { ...prev };
      delete copy[medId];
      return copy;
    });
  }

  function toggleGiven(medId, timeKey) {
    setGiven((prev) => ({
      ...prev,
      [medId]: {
        ...(prev[medId] ?? {}),
        [timeKey]: !(prev[medId]?.[timeKey] ?? false),
      },
    }));
  }

  const activeMeds = useMemo(() => meds.filter((m) => m.isActive), [meds]);

  const dueToday = useMemo(() => {
    // meds activos que tienen al menos un horario marcado
    return activeMeds.filter((m) => Object.values(m.schedule).some(Boolean));
  }, [activeMeds]);

  const progress = useMemo(() => {
    let due = 0;
    let done = 0;

    for (const med of dueToday) {
      for (const t of TIMES) {
        if (med.schedule[t.key]) {
          due += 1;
          if (given?.[med.id]?.[t.key]) done += 1;
        }
      }
    }
    return { done, due };
  }, [dueToday, given]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:underline">
          ← Back
        </button>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Vet & Meds</h2>
            <p className="text-muted-foreground">
              {pet?.name} · {dateStr} · {progress.done}/{progress.due} doses done
            </p>
          </div>

          <button
            onClick={openAdd}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            + Add medication
          </button>
        </div>
      </header>

      {/* Daily Med Check */}
      <section className="space-y-3">
        <div className="font-semibold">Today’s meds</div>

        {dueToday.length === 0 ? (
          <div className="rounded-2xl border p-6 text-muted-foreground">
            No active meds scheduled. Add one to start tracking ✨
          </div>
        ) : (
          <div className="space-y-3">
            {dueToday.map((med) => (
              <div key={med.id} className="rounded-2xl border p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {med.name}
                      {med.dose ? <span className="text-muted-foreground"> · {med.dose}</span> : null}
                    </div>
                    {med.notes ? (
                      <div className="text-sm text-muted-foreground">{med.notes}</div>
                    ) : null}
                  </div>
                  <button
                    onClick={() => toggleActive(med.id)}
                    className="text-sm text-muted-foreground hover:underline"
                    title="Stop tracking this med"
                  >
                    Mark inactive
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {TIMES.map((t) => {
                    const isDue = !!med.schedule[t.key];
                    if (!isDue) return null;

                    const isDone = !!given?.[med.id]?.[t.key];

                    return (
                      <label
                        key={t.key}
                        className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-black/5"
                      >
                        <div className="text-sm font-medium">{t.label}</div>
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggleGiven(med.id, t.key)}
                          className="h-5 w-5"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add medication */}
      {isAdding && (
        <form onSubmit={addMed} className="rounded-2xl border p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Medication name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Amoxicillin"
                className="w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Dose (optional)</label>
              <input
                value={form.dose}
                onChange={(e) => setForm((p) => ({ ...p, dose: e.target.value }))}
                placeholder="e.g. 1 tablet / 2.5 ml"
                className="w-full rounded-xl border px-3 py-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Schedule</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {TIMES.map((t) => (
                <label key={t.key} className="flex items-center gap-3 rounded-xl border p-3">
                  <input
                    type="checkbox"
                    checked={!!form.schedule[t.key]}
                    onChange={() =>
                      setForm((p) => ({
                        ...p,
                        schedule: { ...p.schedule, [t.key]: !p.schedule[t.key] },
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{t.label}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: choose the times you want PawTrack to track daily.
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notes (optional)</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. with food, after walk..."
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

      {/* Active meds list (manage) */}
      <section className="space-y-3">
        <div className="font-semibold">Manage medications</div>

        {meds.length === 0 ? (
          <div className="rounded-2xl border p-6 text-muted-foreground">
            No medications added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {meds.map((m) => (
              <div key={m.id} className="rounded-2xl border p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold">
                    {m.name}
                    {m.dose ? <span className="text-muted-foreground"> · {m.dose}</span> : null}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Schedule:{" "}
                    {TIMES.filter((t) => m.schedule[t.key])
                      .map((t) => t.label)
                      .join(", ") || "None"}
                    {" · "}
                    Status: {m.isActive ? "Active" : "Inactive"}
                  </div>
                  {m.notes ? <div className="text-sm text-muted-foreground">{m.notes}</div> : null}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => toggleActive(m.id)}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {m.isActive ? "Make inactive" : "Make active"}
                  </button>
                  <button
                    onClick={() => deleteMed(m.id)}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
