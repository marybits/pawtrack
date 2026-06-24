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
    <div className="min-h-screen bg-stone-50">
      {/* Top bar — app name left, logout right */}
      <header className="sticky top-0 z-40 bg-stone-50 border-b border-stone-200">
        <div className="max-w-sm mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold text-stone-950 tracking-tight">
            PawTrack
          </span>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-stone-400">{user.username}</span>
            )}
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="text-stone-400 hover:text-stone-700 transition-colors"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-sm mx-auto px-4 pt-6 pb-24">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
