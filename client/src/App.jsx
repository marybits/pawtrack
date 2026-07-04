import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./components/RequireAuth.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Pets from "./pages/Pets.jsx";
import PetProfile from "./pages/PetProfile.jsx";
import Log from "./pages/Log.jsx";
import Routine from "./pages/Routine.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected — auth check first, then app shell (Layout + BottomNav) */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/home"         element={<Home />} />
          <Route path="/pets"         element={<Pets />} />
          <Route path="/pets/:petId"  element={<PetProfile />} />
          <Route path="/log"          element={<Log />} />
          <Route path="/routine"      element={<Routine />} />
        </Route>
      </Route>

      {/* Default */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
