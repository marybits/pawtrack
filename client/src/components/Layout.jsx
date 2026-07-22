import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { LogOut, Home, PawPrint, Plus, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthProvider.jsx";
import BottomNav from "./BottomNav.jsx";

/* ── Desktop sidebar link ─────────────────────────────────────────────────── */
function SidebarLink({ to, label, Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
          isActive
            ? "bg-[#3D3170]/10 text-[#3D3170] font-semibold"
            : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
        }`
      }
    >
      <Icon size={18} strokeWidth={1.75} />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F5F4F7]">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#F5F4F7]/92 backdrop-blur-md border-b border-stone-200/50 shadow-[0_1px_12px_rgba(61,49,112,0.06)]">
        <div className="max-w-md mx-auto lg:max-w-none px-4 lg:px-6 h-14 flex items-center justify-between">
          {/* Two-tone wordmark */}
          <span className="text-xl font-extrabold tracking-tight select-none">
            <span className="text-[#3D3170]">Paw</span>
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

      {/* ── Desktop sidebar (lg+) ────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-14 bottom-0 w-56 bg-[#FFFFFF] border-r border-stone-200/60 z-30 px-3 py-5 gap-1 overflow-y-auto">
        <SidebarLink to="/home"    label="Home"    Icon={Home}      end />
        <SidebarLink to="/log"     label="Log"     Icon={Plus}          />
        <SidebarLink to="/pets"    label="Pets"    Icon={PawPrint}      />
        <SidebarLink to="/routine" label="Routine" Icon={BarChart3}     />
      </aside>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 pt-6 pb-28 lg:ml-56 lg:max-w-4xl lg:px-8 lg:pb-10">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
