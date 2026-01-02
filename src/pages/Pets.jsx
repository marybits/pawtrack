import { useState } from "react";

const initialPets = [
  { id: "p1", name: "Tom", species: "cat" },
  { id: "p2", name: "Sophia", species: "dog" },
];

export default function Pets({ onSelectPet }) {
  const [pets] = useState(initialPets);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Pets</h2>
          <p className="text-muted-foreground">Select a pet to view their tracker.</p>
        </div>

        <button className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-black/5">
          + Add new pet
        </button>
      </header>

      <div className="space-y-3">
        {pets.map((pet) => (
          <button
            key={pet.id}
            onClick={() => onSelectPet(pet)}
            className="w-full text-left rounded-2xl border p-4 hover:bg-black/5"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border flex items-center justify-center text-sm">
                {pet.species === "cat" ? "🐱" : "🐶"}
              </div>
              <div>
                <div className="font-semibold">{pet.name}</div>
                <div className="text-sm text-muted-foreground">
                  {pet.species === "cat" ? "Cat" : "Dog"}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
