import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./components/RequireAuth.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

// Stub placeholders — replaced in Phase 5 with real page components.
function ComingSoon({ label }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <p className="text-stone-400 text-sm">{label} — coming in Phase 5</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected — RequireAuth as layout route */}
      <Route element={<RequireAuth />}>
        <Route path="/pets" element={<ComingSoon label="Pets" />} />
        <Route path="/log" element={<ComingSoon label="Log" />} />
        <Route path="/routine" element={<ComingSoon label="Routine" />} />
      </Route>

      {/* Default */}
      <Route path="*" element={<Navigate to="/pets" replace />} />
    </Routes>
  );
}
