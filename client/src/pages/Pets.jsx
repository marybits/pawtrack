import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PawPrint, Plus, X, ChevronDown, ChevronUp, Pill, ChevronRight } from "lucide-react";
import { getPets, registerPet } from "../api/pets.js";
import { getPrescriptions, addPrescription, patchPrescription } from "../api/prescriptions.js";

// ── Shared input style ─────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-xl border border-stone-200 bg-[#F5F4F7] px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3D3170]/30 focus:border-[#3D3170] transition-colors";

// ── Frequency options ──────────────────────────────────────────────────────
const FREQ_OPTIONS = [
  { label: "Twice daily",  hours: 12  },
  { label: "Once daily",   hours: 24  },
  { label: "Every 2 days", hours: 48  },
  { label: "Every 3 days", hours: 72  },
  { label: "Weekly",       hours: 168 },
];

function intervalLabel(h) {
  const opt = FREQ_OPTIONS.find((o) => o.hours === h);
  return opt ? opt.label.toLowerCase() : `every ${Math.round(h / 24)} days`;
}

// ── Pet avatar — brand amber, consistent across all pets ──────────────────
const PET_ACCENT = { bg: "bg-[#F0EEF3]", text: "text-[#3D3170]" };
function petAccent() { return PET_ACCENT; }

// ── Skeleton ───────────────────────────────────────────────────────────────
function PetSkeleton() {
  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 p-4 animate-pulse shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-stone-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-stone-100 rounded-full w-1/3" />
          <div className="h-2.5 bg-stone-100 rounded-full w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ── Add-prescription form ──────────────────────────────────────────────────
const EMPTY_RX = {
  medicationName: "", intervalHours: 24,
  dose: "", doseUnit: "", startDate: "", endDate: "", notes: "",
};

function AddRxForm({ petId, onSuccess, onCancel }) {
  const [form, setForm]     = useState(EMPTY_RX);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) =>
      setForm((f) => ({
        ...f,
        [field]: field === "intervalHours" ? Number(e.target.value) : e.target.value,
      }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        medicationName: form.medicationName.trim(),
        intervalHours:  form.intervalHours,
        dose:           form.dose     !== "" ? Number(form.dose)   : undefined,
        doseUnit:       form.doseUnit.trim() || undefined,
        startDate:      form.startDate || undefined,
        endDate:        form.endDate   || undefined,
        notes:          form.notes.trim() || undefined,
      };
      const rx = await addPrescription(petId, payload);
      setForm(EMPTY_RX);
      onSuccess(rx);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 pt-3 border-t border-stone-100 flex flex-col gap-3"
    >
      <p className="text-xs font-semibold text-[#3D3170] flex items-center gap-1.5">
        <Pill size={11} /> New prescription
      </p>

      <input
        required
        value={form.medicationName}
        onChange={set("medicationName")}
        placeholder="Medication name (e.g. Amoxicillin)"
        className={inputClass}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-stone-500 mb-1">
            Dose <span className="text-stone-300">(optional)</span>
          </label>
          <input
            type="number" min="0" step="0.1"
            value={form.dose}
            onChange={set("dose")}
            placeholder="e.g. 250"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Unit</label>
          <input
            value={form.doseUnit}
            onChange={set("doseUnit")}
            placeholder="pill / mg / ml"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Frequency</label>
          <select
            value={form.intervalHours}
            onChange={set("intervalHours")}
            className={inputClass}
          >
            {FREQ_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Start date</label>
          <input
            type="date"
            value={form.startDate || todayISO}
            onChange={set("startDate")}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-stone-500 mb-1">
            End date <span className="text-stone-300">(or leave blank)</span>
          </label>
          <input
            type="date"
            value={form.endDate}
            min={form.startDate || todayISO}
            onChange={set("endDate")}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Notes</label>
          <input
            value={form.notes}
            onChange={set("notes")}
            placeholder="e.g. with food"
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2 border border-rose-200">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors active:scale-[0.98] duration-150"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#3D3170] hover:bg-[#2E2454] text-white rounded-xl px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98] duration-150 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ── Prescription row ───────────────────────────────────────────────────────
function RxRow({ petId, rx, onDeactivated }) {
  const [loading, setLoading] = useState(false);

  async function deactivate() {
    setLoading(true);
    try {
      await patchPrescription(petId, rx._id, { active: false });
      onDeactivated(rx._id);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  const dateRange = (() => {
    const start = new Date(rx.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!rx.endDate) return `from ${start}`;
    const end = new Date(rx.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${start} – ${end}`;
  })();

  return (
    <div className="flex items-start justify-between gap-2 py-2">
      <div className="min-w-0 flex items-start gap-2">
        <Pill size={13} strokeWidth={1.5} className="text-[#3D3170] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">{rx.medicationName}</p>
          <p className="text-xs text-stone-400">
            {[
              intervalLabel(rx.intervalHours),
              rx.dose != null ? `${rx.dose}${rx.doseUnit ? " " + rx.doseUnit : ""}` : null,
              dateRange,
              rx.notes || null,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <button
        onClick={deactivate}
        disabled={loading}
        title="Deactivate"
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-rose-400 hover:bg-rose-50 transition-colors disabled:opacity-40 mt-0.5"
      >
        {loading ? <span className="text-xs">…</span> : <X size={13} />}
      </button>
    </div>
  );
}

// ── Pet card ───────────────────────────────────────────────────────────────
function PetCard({ pet }) {
  const navigate = useNavigate();
  const [showRx, setShowRx]       = useState(false);
  const [rxList, setRxList]       = useState([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [showForm, setShowForm]   = useState(false);

  const accent = petAccent(pet.name);

  useEffect(() => {
    if (!showRx) return;
    setRxLoading(true);
    getPrescriptions(pet._id, { activeOnly: true })
      .then(setRxList)
      .catch(console.error)
      .finally(() => setRxLoading(false));
  }, [showRx, pet._id]);

  function handleRxAdded(rx) {
    setRxList((prev) => [rx, ...prev]);
    setShowForm(false);
  }

  function handleDeactivated(rxId) {
    setRxList((prev) => prev.filter((r) => r._id !== rxId));
  }

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">

      {/* ── Pet identity — tappable → profile ────────────────────────────── */}
      <button
        onClick={() => navigate(`/pets/${pet._id}`)}
        className="flex items-center gap-3 w-full text-left group"
      >
        <div className={`w-12 h-12 rounded-2xl ${accent.bg} flex items-center justify-center shrink-0 overflow-hidden`}>
          {pet.avatarUrl
            ? <img src={pet.avatarUrl} alt={pet.name} className="w-full h-full object-cover" />
            : <PawPrint size={22} strokeWidth={1.75} className={accent.text} />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-stone-950 truncate">{pet.name}</p>
          <p className="text-xs text-stone-400 capitalize truncate">
            {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
          </p>
        </div>
        <ChevronRight size={15} className="text-stone-300 group-hover:text-stone-400 transition-colors shrink-0" />
      </button>

      {/* ── Stat pills ────────────────────────────────────────────────────── */}
      {(pet.age != null || pet.weight != null) && (
        <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
          {pet.age    != null && (
            <span className="bg-stone-100 text-stone-600 rounded-full px-2.5 py-0.5 text-xs font-medium">
              {pet.age} yr
            </span>
          )}
          {pet.weight != null && (
            <span className="bg-stone-100 text-stone-600 rounded-full px-2.5 py-0.5 text-xs font-medium">
              {pet.weight} kg
            </span>
          )}
        </div>
      )}

      {/* ── Prescriptions toggle ──────────────────────────────────────────── */}
      <button
        onClick={() => setShowRx((v) => !v)}
        className="mt-3 w-full flex items-center justify-between border-t border-stone-100 pt-3 transition-colors group"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#3D3170] group-hover:text-[#2E2454] transition-colors">
          <Pill size={12} strokeWidth={1.75} />
          Prescriptions
        </span>
        <span className="text-stone-300 group-hover:text-stone-500 transition-colors">
          {showRx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {showRx && (
        <div className="mt-1">
          {rxLoading ? (
            <p className="text-xs text-stone-400 py-2 pl-1">Loading…</p>
          ) : rxList.length === 0 && !showForm ? (
            <p className="text-xs text-stone-400 py-2 pl-1">No active prescriptions.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {rxList.map((rx) => (
                <RxRow
                  key={rx._id}
                  petId={pet._id}
                  rx={rx}
                  onDeactivated={handleDeactivated}
                />
              ))}
            </div>
          )}

          {showForm ? (
            <AddRxForm
              petId={pet._id}
              onSuccess={handleRxAdded}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-[#3D3170] transition-colors"
            >
              <Plus size={12} /> Add prescription
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Register pet form ──────────────────────────────────────────────────────
const EMPTY_PET = { name: "", species: "", breed: "", age: "", weight: "" };

function RegisterForm({ onSuccess, onCancel }) {
  const [form, setForm]       = useState(EMPTY_PET);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        name:    form.name.trim(),
        species: form.species.trim(),
        breed:   form.breed.trim()  || undefined,
        age:     form.age    !== "" ? Number(form.age)    : undefined,
        weight:  form.weight !== "" ? Number(form.weight) : undefined,
      };
      const pet = await registerPet(payload);
      setForm(EMPTY_PET);
      onSuccess(pet);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-950 mb-4">Register a pet</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Name <span className="text-rose-400">*</span>
            </label>
            <input required value={form.name} onChange={set("name")} placeholder="Sophia" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Species <span className="text-rose-400">*</span>
            </label>
            <input required value={form.species} onChange={set("species")} placeholder="cat" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">
            Breed <span className="text-stone-300">(optional)</span>
          </label>
          <input value={form.breed} onChange={set("breed")} placeholder="Tabby" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Age (years)</label>
            <input type="number" min="0" step="0.5" value={form.age} onChange={set("age")} placeholder="3" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Weight (kg)</label>
            <input type="number" min="0" step="0.1" value={form.weight} onChange={set("weight")} placeholder="4.2" className={inputClass} />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors active:scale-[0.98] duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#3D3170] hover:bg-[#2E2454] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98] duration-150 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Add pet"}
          </button>
        </div>

      </form>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Pets() {
  const [pets, setPets]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getPets()
      .then(setPets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handlePetAdded(pet) {
    setPets((prev) => [pet, ...prev]);
    setShowForm(false);
  }

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-950 tracking-tight">Your Pets</h1>
          {!loading && pets.length > 0 && (
            <p className="text-xs text-stone-400 mt-0.5">
              {pets.length} {pets.length === 1 ? "pet" : "pets"} registered
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          aria-label={showForm ? "Cancel" : "Add pet"}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors active:scale-[0.96] duration-150 shadow-sm ${
            showForm
              ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
              : "bg-[#3D3170] text-white hover:bg-[#2E2454]"
          }`}
        >
          {showForm ? <X size={16} strokeWidth={2} /> : <Plus size={16} strokeWidth={2} />}
        </button>
      </div>

      {/* ── Register form ───────────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-4">
          <RegisterForm onSuccess={handlePetAdded} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <>
            <PetSkeleton />
            <PetSkeleton />
          </>
        ) : pets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F0EEF3] flex items-center justify-center mb-4">
              <PawPrint size={26} strokeWidth={1.5} className="text-[#3D3170]" />
            </div>
            <p className="text-stone-500 text-sm leading-relaxed">
              No pets yet — tap{" "}
              <strong className="text-stone-700">+</strong>{" "}
              to register your first pet.
            </p>
          </div>
        ) : (
          pets.map((pet) => <PetCard key={pet._id} pet={pet} />)
        )}
      </div>
    </div>
  );
}
