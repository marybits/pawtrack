export default function PetProfile({
  pet,
  onBack,
  onOpenDailyCheck,
  onOpenNutrition,
  onOpenVet,
}) {
  const tiles = [
    { key: "nutrition", label: "Nutrition", desc: "Meals and treats" },
    { key: "vet", label: "Vet & Meds", desc: "Meds schedule + vet notes" },
    { key: "walking", label: "Walking log", desc: "Walks + potty notes" },
    { key: "daily", label: "Daily check", desc: "Food / water / litter / play" },
    { key: "emergency", label: "Emergency", desc: "Contacts + critical info" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back
          </button>

          <h2 className="text-2xl font-bold">{pet?.name}</h2>

          <p className="text-muted-foreground">
            {pet?.species === "cat" ? "Cat" : "Dog"} profile
          </p>
        </div>

        <button className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-black/5">
          Export
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <button
            key={t.key}
            className="rounded-2xl border p-4 text-left hover:bg-black/5"
            onClick={() => {
              if (t.key === "nutrition") onOpenNutrition?.();
              else if (t.key === "vet") onOpenVet?.();
              else if (t.key === "daily") onOpenDailyCheck?.();
              else alert(`Next: ${t.label}`);
            }}
          >
            <div className="font-semibold">{t.label}</div>
            <div className="text-sm text-muted-foreground">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
