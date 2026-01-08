function petAvatar(pet) {
  // Si luego quieres foto real, aquí la reemplazas por <img src=... />
  const emoji = pet.species === "cat" ? "🐱" : "🐶";
  return (
    <div className="h-12 w-12 flex-none rounded-full bg-gray-100 flex items-center justify-center text-xl">
      {emoji}
    </div>
  );
}

export default function PetListItem({ pet, onSelect }) {
  return (
    <li className="flex items-center justify-between gap-x-6 px-4 py-5">
      <div className="flex min-w-0 items-center gap-x-4">
        {petAvatar(pet)}
        <div className="min-w-0 flex-auto">
          <p className="text-sm font-semibold text-gray-900">{pet.name}</p>
          <p className="mt-1 truncate text-sm text-gray-500">
            {pet.breed ?? (pet.species === "cat" ? "Cat" : "Dog")}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(pet)}
        className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
      >
        View
      </button>
    </li>
  );
}
