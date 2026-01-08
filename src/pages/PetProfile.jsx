export default function PetProfile({
  pet,
  onBack,
  onOpenDaily,
  onOpenHistory,
  onOpenRoutine,
  onOpenEmergency,
}) {

  const tiles = [
    { key: "daily", label: "Daily care", desc: "Track meals, portions, walks, exercise, and essential daily checks." },
    { key: "history", label: "History", desc: "View previous daily logs" },
    { key: "routine", label: "Pet Routine", desc: "Pet routine & instructions" },
    { key: "emergency", label: "Emergency", desc: "Emergency contact & vet info" },
];


  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:underline">
          ← Back
        </button>
        <h2 className="text-2xl font-bold">{pet?.name}</h2>
        <p className="text-muted-foreground">{pet?.species === "cat" ? "Cat" : "Dog"} profile</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <button
            key={t.key}
            className="rounded-2xl border p-4 text-left hover:bg-black/5"
            onClick={() => {
              if (t.key === "daily") onOpenDaily?.();
              else if (t.key === "history") onOpenHistory?.();
              else if (t.key === "routine") onOpenRoutine?.();
              else if (t.key === "emergency") onOpenEmergency?.();    
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

