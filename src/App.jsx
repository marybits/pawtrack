import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";

import Pets from "./pages/Pets";
import PetProfile from "./pages/PetProfile";
import DailyCheck from "./pages/DailyCheck";
import Nutrition from "./pages/Nutrition";
import VetAndMeds from "./pages/VetAndMeds";


export default function App() {
  const [selectedPet, setSelectedPet] = useState(null);
  const [screen, setScreen] = useState("pets"); // "pets" | "profile" | "daily" | "nutrition" | "vet"


  const title =
    screen === "pets" ? "My Pets" : selectedPet?.name ?? "PawTrack";

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
          onOpenDailyCheck={() => setScreen("daily")}
          onOpenNutrition={() => setScreen("nutrition")}
          onOpenVet={() => setScreen("vet")}
        />
      )}

      {screen === "nutrition" && selectedPet && (
        <Nutrition pet={selectedPet} onBack={() => setScreen("profile")} />
    )}

      {screen === "daily" && selectedPet && (
        <DailyCheck
          pet={selectedPet}
          onBack={() => setScreen("profile")}
        />
      )}

      {screen === "vet" && selectedPet && (
        <VetAndMeds pet={selectedPet} onBack={() => setScreen("profile")} />
    )}

    </AppShell>
  );
}
