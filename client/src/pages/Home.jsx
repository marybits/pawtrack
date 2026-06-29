import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PawPrint, Flame, Utensils, Activity, Pill, Plus,
  ChevronRight, Calendar, Stethoscope, Scissors, Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthProvider.jsx";
import { getPets } from "../api/pets.js";
import { getEvents } from "../api/events.js";
import { getPrescriptions } from "../api/prescriptions.js";

// ── Helpers ────────────────────────────────────────────────────────────────
function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const mins = Math.round((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function computeStreak(events) {
  const now = new Date();
  let s = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (events.some((ev) => isSameLocalDay(new Date(ev.occurredAt), d))) s++;
    else break;
  }
  return s;
}

const EVENT_META = {
  meal:       { label: "Meal",       Icon: Utensils    },
  walk:       { label: "Walk",       Icon: Activity    },
  medication: { label: "Medication", Icon: Pill        },
  vet:        { label: "Vet visit",  Icon: Stethoscope },
  grooming:   { label: "Grooming",   Icon: Scissors    },
  play:       { label: "Play",       Icon: Zap         },
  poop:       { label: "Bathroom",   Icon: Calendar    },
  weight:     { label: "Weight",     Icon: Activity    },
};

// ── Sub-components ─────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`bg-stone-100 rounded-2xl animate-pulse ${className}`} />;
}

function StatusPill({ Icon, label, warn = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
        warn
          ? "bg-orange-50 border border-orange-200/80 text-orange-700"
          : "bg-stone-100 text-stone-500"
      }`}
    >
      <Icon size={11} strokeWidth={2} className={warn ? "text-orange-500" : "text-stone-400"} />
      {label}
    </span>
  );
}

function PetCard({ pet, events, prescriptions, onLog }) {
  const sorted = (type) =>
    [...events]
      .filter((e) => e.type === type)
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

  const lastMeal = sorted("meal")[0];
  const lastWalk = sorted("activity")[0];
  const streak   = computeStreak(events);
  const now      = Date.now();
  const today    = new Date();

  const todayCount = events.filter((e) =>
    isSameLocalDay(new Date(e.occurredAt), today)
  ).length;

  const noMealToday = !events.some(
    (e) => e.type === "meal" && isSameLocalDay(new Date(e.occurredAt), today)
  );

  const dueMeds = prescriptions.filter((rx) => {
    if (rx.active === false) return false;
    const lastDose = sorted("medication").find(
      (e) => e.details?.prescriptionId === rx._id
    );
    if (!lastDose) return true;
    const nextDue =
      new Date(lastDose.occurredAt).getTime() + rx.intervalHours * 3600000;
    return nextDue <= now;
  });

  return (
    <div className="bg-[#FFFCF7] rounded-2xl border border-stone-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] flex items-center justify-center shrink-0">
            <PawPrint size={20} strokeWidth={1.75} className="text-[#B45309]" />
          </div>
          <div>
            <p className="text-base font-bold text-stone-950 leading-tight">{pet.name}</p>
            <p className="text-xs text-stone-400 capitalize">
              {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
              {pet.weightKg ? ` · ${pet.weightKg} kg` : ""}
            </p>
          </div>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 bg-gradient-to-r from-amber-50 to-[#FFFCF7] border border-amber-200/60 rounded-full px-2.5 py-1">
            <Flame size={12} className="text-[#B45309]" />
            <span className="text-xs font-bold text-[#B45309]">{streak}</span>
          </div>
        )}
      </div>

      {/* ── Status pills ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <StatusPill
          Icon={Utensils}
          label={timeAgo(lastMeal?.occurredAt) ?? "No meal logged"}
          warn={noMealToday}
        />
        <StatusPill
          Icon={Activity}
          label={timeAgo(lastWalk?.occurredAt) ?? "No activity logged"}
        />
        {todayCount > 0 && (
          <StatusPill
            Icon={Calendar}
            label={`${todayCount} event${todayCount > 1 ? "s" : ""} today`}
          />
        )}
      </div>

      {/* ── Due medications ───────────────────────────────────────────────── */}
      {dueMeds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {dueMeds.map((rx) => (
            <span
              key={rx._id}
              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-orange-50 border border-orange-200 text-orange-800 rounded-full px-2.5 py-1"
            >
              <Pill size={9} />
              {rx.name} due
            </span>
          ))}
        </div>
      )}

      {/* ── Quick-log CTA ─────────────────────────────────────────────────── */}
      <button
        onClick={() => onLog(pet._id)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FEF3C7] hover:bg-amber-100 text-[#B45309] text-sm font-semibold active:scale-[0.98] transition-all duration-150"
      >
        <Plus size={14} strokeWidth={2.5} />
        Log for {pet.name}
      </button>
    </div>
  );
}

function ActivityItem({ event, petName }) {
  const cfg = EVENT_META[event.type] ?? { label: event.type, Icon: Calendar };
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0">
        <cfg.Icon size={13} strokeWidth={2} className="text-[#B45309]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-800 truncate">
          <span className="font-semibold">{petName}</span>
          {" · "}
          <span className="text-stone-500">{cfg.label}</span>
        </p>
      </div>
      <span className="text-xs text-stone-400 shrink-0 pl-2">
        {timeAgo(event.occurredAt)}
      </span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [pets, setPets]       = useState([]);
  const [petData, setPetData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const petList = await getPets();
        if (cancelled) return;
        setPets(petList);

        const from = new Date();
        from.setDate(from.getDate() - 30);

        const results = await Promise.all(
          petList.map(async (pet) => {
            const [events, prescriptions] = await Promise.all([
              getEvents(pet._id, { from: from.toISOString() }),
              getPrescriptions(pet._id).catch(() => []),
            ]);
            return { petId: pet._id, events, prescriptions };
          })
        );

        if (cancelled) return;
        const map = {};
        results.forEach(({ petId, events, prescriptions }) => {
          map[petId] = { events, prescriptions };
        });
        setPetData(map);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function handleLogForPet(petId) {
    navigate("/log", { state: { preselectedPetId: petId } });
  }

  // Cross-pet today feed
  const todayFeed = [];
  const today = new Date();
  pets.forEach((pet) => {
    const { events = [] } = petData[pet._id] ?? {};
    events
      .filter((e) => isSameLocalDay(new Date(e.occurredAt), today))
      .forEach((e) => todayFeed.push({ ...e, petName: pet.name }));
  });
  todayFeed.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  const recentFeed = todayFeed.slice(0, 6);

  return (
    <div>
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs text-stone-400 font-medium tracking-wide mb-1">
          {todayLabel()}
        </p>
        <h1 className="text-2xl font-bold text-stone-950 tracking-tight">
          {greetingWord()}{user?.username ? `, ${user.username}` : ""}
        </h1>
        {!loading && pets.length > 0 && (
          <p className="text-sm text-stone-400 mt-1">
            Here's how your {pets.length === 1 ? "pet is" : "pets are"} doing today.
          </p>
        )}
      </div>

      {/* ── Pet cards ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-3 mb-6">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : pets.length === 0 ? (
        <div className="bg-[#FEF3C7] rounded-2xl p-8 text-center mb-6">
          <PawPrint size={36} strokeWidth={1.5} className="text-[#B45309] mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-800 mb-1">No pets registered yet</p>
          <p className="text-xs text-stone-500 mb-5">Add your first pet to start tracking their health.</p>
          <button
            onClick={() => navigate("/pets")}
            className="bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            Add a pet
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {pets.map((pet) => (
            <PetCard
              key={pet._id}
              pet={pet}
              events={petData[pet._id]?.events ?? []}
              prescriptions={petData[pet._id]?.prescriptions ?? []}
              onLog={handleLogForPet}
            />
          ))}
        </div>
      )}

      {/* ── Today's activity feed ─────────────────────────────────────────── */}
      {!loading && pets.length > 0 && (
        <section className="bg-[#FFFCF7] rounded-2xl border border-stone-200/60 shadow-sm p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B45309] shrink-0" />
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Today's activity
            </p>
          </div>
          {recentFeed.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">
              Nothing logged yet today.
            </p>
          ) : (
            recentFeed.map((ev, i) => (
              <ActivityItem key={ev._id ?? i} event={ev} petName={ev.petName} />
            ))
          )}
        </section>
      )}

      {/* ── Manage pets link ─────────────────────────────────────────────── */}
      {!loading && (
        <button
          onClick={() => navigate("/pets")}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-stone-200/60 bg-[#FFFCF7] text-sm text-stone-500 hover:border-stone-300 hover:bg-stone-50 transition-colors active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">
            <PawPrint size={13} strokeWidth={1.75} className="text-stone-400" />
            Manage pets & prescriptions
          </span>
          <ChevronRight size={14} className="text-stone-300" />
        </button>
      )}
    </div>
  );
}
