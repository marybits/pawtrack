import { useState, useEffect } from "react";
import { PawPrint, Plus, X } from "lucide-react";
import { getPets, registerPet } from "../api/pets.js";

// ── Skeleton card shown while the pet list is loading ──────────────────────
function PetSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-stone-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-stone-100 rounded w-1/3" />
          <div className="h-2.5 bg-stone-100 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ── Individual pet card ────────────────────────────────────────────────────
function PetCard({ pet }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
          <PawPrint size={16} strokeWidth={1.5} className="text-stone-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-950 truncate">
            {pet.name}
          </p>
          <p className="text-xs text-stone-400 capitalize truncate">
            {pet.species}
            {pet.breed ? ` · ${pet.breed}` : ""}
          </p>
        </div>
      </div>
      {(pet.age != null || pet.weight != null) && (
        <div className="mt-3 flex gap-4 text-xs text-stone-500 border-t border-stone-100 pt-3">
          {pet.age   != null && <span>{pet.age} yr</span>}
          {pet.weight != null && <span>{pet.weight} kg</span>}
        </div>
      )}
    </div>
  );
}

// ── Register pet form ──────────────────────────────────────────────────────
const EMPTY_FORM = { name: "", species: "", breed: "", age: "", weight: "" };

function RegisterForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
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
        name: form.name.trim(),
        species: form.species.trim(),
        breed:   form.breed.trim()  || undefined,
        age:     form.age    !== "" ? Number(form.age)    : undefined,
        weight:  form.weight !== "" ? Number(form.weight) : undefined,
      };
      const pet = await registerPet(payload);
      setForm(EMPTY_FORM);
      onSuccess(pet);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent";

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <h2 className="text-sm font-semibold text-stone-950 mb-4">
        Register a pet
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={set("name")}
              placeholder="Sophia"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Species <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.species}
              onChange={set("species")}
              placeholder="cat"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">
            Breed <span className="text-stone-300">(optional)</span>
          </label>
          <input
            value={form.breed}
            onChange={set("breed")}
            placeholder="Tabby"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Age (years)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.age}
              onChange={set("age")}
              placeholder="3"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Weight (kg)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.weight}
              onChange={set("weight")}
              placeholder="4.2"
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-stone-950 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
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
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
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
      {/* Heading row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-stone-950 tracking-tight">
          Your Pets
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          aria-label={showForm ? "Cancel" : "Add pet"}
          className="w-9 h-9 rounded-full bg-stone-950 text-white flex items-center justify-center hover:bg-stone-800 transition-colors shadow-sm"
        >
          {showForm ? (
            <X size={16} strokeWidth={2} />
          ) : (
            <Plus size={16} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Register form */}
      {showForm && (
        <div className="mb-4">
          <RegisterForm
            onSuccess={handlePetAdded}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Pet list / loading / empty */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <>
            <PetSkeleton />
            <PetSkeleton />
          </>
        ) : pets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <PawPrint size={28} strokeWidth={1.5} className="text-stone-400" />
            </div>
            <p className="text-stone-500 text-sm leading-relaxed">
              No pets yet — tap <strong className="text-stone-700">+</strong> to
              register your first pet.
            </p>
          </div>
        ) : (
          pets.map((pet) => <PetCard key={pet._id} pet={pet} />)
        )}
      </div>
    </div>
  );
}
