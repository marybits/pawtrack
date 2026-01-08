import { useState } from "react";
import PetListItem from "../components/layout/PetListItem";

const seedPets = [
  { id: "p1", name: "Tom", species: "cat", breed: "Domestic Shorthair" },
  { id: "p2", name: "Sophia", species: "cat", breed: "Russian Blue" },
    { id: "p3", name: "Max", species: "dog", breed: "Golden Retriever" },
];

export default function Pets({ onSelectPet }) {
  const [pets] = useState(seedPets);

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
        <ul role="list" className="list-none divide-y divide-gray-100 p-0 m-0">
          {pets.map((pet) => (
            <PetListItem key={pet.id} pet={pet} onSelect={onSelectPet} />
          ))}

          <li className="p-4">
            <button
              type="button"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
              onClick={() => alert("Add pet – coming soon")}
            >
              + Add pet
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
