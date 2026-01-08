import { useMemo } from "react";
import { getDailyLogsForPet } from "../lib/dailyLog";

const CHECKLIST_LABELS = {
  water: "Water",
  meds: "Medication",
  litter: "Litter box",
};

const CHECKLIST_TASKS_BY_SPECIES = {
  cat: ["water", "meds", "litter"],
  dog: ["water", "meds"], // walks van como logs con duración
};

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

function formatMaybe(n, digits = 2) {
  if (!Number.isFinite(n)) return "0";
  // evita 1.00 -> 1
  const fixed = n.toFixed(digits);
  return fixed.replace(/\.?0+$/, "");
}

function checklistStats(log, species) {
  const taskKeys = CHECKLIST_TASKS_BY_SPECIES[species] ?? Object.keys(CHECKLIST_LABELS);
  const checked = log?.checked ?? {};
  const done = taskKeys.filter((k) => !!checked[k]).length;
  return { done, total: taskKeys.length, taskKeys };
}

function feedingStats(log) {
  const feedings = Array.isArray(log?.feedings) ? log.feedings : [];

  const dryTotal = sum(feedings.map((f) => num(f?.dryCups)));

  const wetCansTotal = sum(
    feedings
      .filter((f) => f?.wetUnit === "can")
      .map((f) => num(f?.wetAmount))
  );

  const wetTbspTotal = sum(
    feedings
      .filter((f) => f?.wetUnit === "tbsp")
      .map((f) => num(f?.wetAmount))
  );

  return {
    count: feedings.length,
    dryTotal,
    wetCansTotal,
    wetTbspTotal,
  };
}

function playStats(log) {
  const play = Array.isArray(log?.play) ? log.play : [];
  const minutesTotal = sum(play.map((p) => num(p?.minutes)));
  return { count: play.length, minutesTotal };
}

function walkStats(log) {
  const walks = Array.isArray(log?.walks) ? log.walks : [];
  const minutesTotal = sum(walks.map((w) => num(w?.durationMin)));
  return { count: walks.length, minutesTotal };
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700">
      {children}
    </span>
  );
}

export default function DailyHistory({ pet, onBack }) {
  const logs = useMemo(() => getDailyLogsForPet(pet?.id), [pet?.id]);
  const species = pet?.species;

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <header className="space-y-2">
        <button onClick={onBack} className="text-sm text-gray-500 hover:underline">
          ← Back
        </button>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Daily History</h2>
          <p className="text-sm text-gray-500">
            {pet?.name} · {logs.length} log{logs.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {logs.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
          No logs yet. Go to <span className="font-medium">Daily Check</span> and log today’s care ✨
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const c = checklistStats(log, species);
            const f = feedingStats(log);
            const p = playStats(log);
            const w = walkStats(log);

            const doneChecklistKeys = c.taskKeys.filter((k) => !!log?.checked?.[k]);

            return (
              <div key={log.date} className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{log.date}</div>
                    <div className="text-sm text-gray-500">
                      Checklist: {c.done}/{c.total}
                    </div>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    Saved
                  </span>
                </div>

                {/* Checklist chips */}
                {doneChecklistKeys.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {doneChecklistKeys.map((k) => (
                      <Chip key={k}>✅ {CHECKLIST_LABELS[k] ?? k}</Chip>
                    ))}
                  </div>
                )}

                {/* Summary chips */}
                <div className="flex flex-wrap gap-2">
                  <Chip>
                    🍽️ Feedings: {f.count}
                    {f.dryTotal > 0 ? ` · Dry ${formatMaybe(f.dryTotal)} cups` : ""}
                    {f.wetCansTotal > 0 ? ` · Wet ${formatMaybe(f.wetCansTotal)} cans` : ""}
                    {f.wetTbspTotal > 0 ? ` · Wet ${formatMaybe(f.wetTbspTotal)} tbsp` : ""}
                  </Chip>

                  <Chip>
                    🎾 Play: {p.count}
                    {p.minutesTotal > 0 ? ` · ${formatMaybe(p.minutesTotal, 0)} min` : ""}
                  </Chip>

                  {species === "dog" && (
                    <Chip>
                      🚶 Walks: {w.count}
                      {w.minutesTotal > 0 ? ` · ${formatMaybe(w.minutesTotal, 0)} min` : ""}
                    </Chip>
                  )}
                </div>

                {/* Notes */}
                {log.notes?.trim() ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Notes</div>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                      {log.notes}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No notes</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
