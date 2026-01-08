import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";


import Pets from "./pages/Pets";
import PetProfile from "./pages/PetProfile";
import DailyCheck from "./pages/DailyCheck";
import DailyHistory from "./pages/DailyHistory";


export default function App() {
  const [selectedPet, setSelectedPet] = useState(null);
  const [screen, setScreen] = useState("pets"); // pets | profile | daily | history


  const title = screen === "pets" ? "My Pets" : selectedPet?.name ?? "PawTrack";

  return (
    <AppShell title={title}>
      {screen === "pets" && (
        <Pets
          onSelectPet={(pet) => {
            setSelectedPet(pet);
            setScreen("profile");
          }}
        />
      )}

      {screen === "profile" && selectedPet && (
        <PetProfile
          pet={selectedPet}
          onBack={() => {
            setSelectedPet(null);
            setScreen("pets");
          }}
          onOpenDaily={() => setScreen("daily")}
          onOpenRoutine={() => alert("Routine (next)")}
          onOpenEmergency={() => alert("Emergency (next)")}
          onOpenHistory={() => setScreen("history")}
        />
      )}

      {screen === "daily" && selectedPet && (
        <DailyCheck pet={selectedPet} onBack={() => setScreen("profile")} />
      )}

      {screen === "history" && selectedPet && (
        <DailyHistory pet={selectedPet} onBack={() => setScreen("profile")} />
      )}

    </AppShell>
  );
}
