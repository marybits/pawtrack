import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthProvider.jsx";
import BottomNav from "./BottomNav.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0]">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#FAF7F0]/92 backdrop-blur-md border-b border-stone-200/50 shadow-[0_1px_12px_rgba(180,83,9,0.06)]">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          {/* Two-tone wordmark */}
          <span className="text-xl font-extrabold tracking-tight select-none">
            <span className="text-[#B45309]">Paw</span>
            <span className="text-stone-900">Track</span>
          </span>

          <div className="flex items-center gap-2">
            {user && (
              <span className="text-xs text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">
                {user.username}
              </span>
            )}
            {/* Logout — 44×44 tap target */}
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="w-11 h-11 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors active:scale-[0.96] duration-150"
            >
              <LogOut size={17} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 pt-6 pb-28">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
