import { NavLink } from "react-router-dom";
import { Home, PawPrint, Plus, BarChart3 } from "lucide-react";

/* Side tabs — Pets and Routine */
function SideTab({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      className="flex-1 flex flex-col items-center"
    >
      {({ isActive }) => (
        <div className="w-full flex flex-col items-center gap-1 pt-2 pb-1 relative">
          {/* Active indicator: sage pill anchored to top */}
          <span
            className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200 ${
              isActive ? "w-6 bg-[#3D3170] opacity-100" : "w-0 opacity-0"
            }`}
          />
          <Icon
            size={22}
            strokeWidth={1.75}
            className={`transition-colors duration-150 ${
              isActive ? "text-[#3D3170]" : "text-stone-400"
            }`}
          />
          <span
            className={`text-[11px] font-medium leading-none transition-colors duration-150 ${
              isActive ? "text-[#3D3170] font-semibold" : "text-stone-400"
            }`}
          >
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}

/* Center Log FAB tab */
function LogTab() {
  return (
    <NavLink
      to="/log"
      aria-label="Log an event"
      className="flex-1 flex flex-col items-center"
    >
      {({ isActive }) => (
        <div className="flex flex-col items-center gap-1 -mt-6">
          {/* Floating circle */}
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all duration-150 active:scale-[0.94] ${
              isActive
                ? "bg-[#2E2454] shadow-lg"
                : "bg-[#3D3170]"
            }`}
          >
            <Plus size={26} strokeWidth={2.25} className="text-white" />
          </div>
          <span
            className={`text-[11px] font-medium leading-none transition-colors duration-150 ${
              isActive ? "text-[#3D3170] font-semibold" : "text-stone-400"
            }`}
          >
            Log
          </span>
        </div>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-[#FFFFFF] border-t border-stone-200/70 shadow-[0_-1px_0_0_rgba(0,0,0,0.04)]">
        <div className="max-w-md mx-auto flex items-end h-16">
          <SideTab to="/home"    label="Home"    Icon={Home}      />
          <LogTab />
          <SideTab to="/routine" label="Routine" Icon={BarChart3} />
        </div>
        {/* Safe-area spacer for notched / island phones */}
        <div className="pb-safe" />
      </div>
    </nav>
  );
}
