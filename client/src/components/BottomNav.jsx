import { NavLink } from "react-router-dom";
import { PawPrint, Plus, BarChart3 } from "lucide-react";

const tabs = [
  { to: "/pets",    label: "Pets",    Icon: PawPrint },
  { to: "/log",     label: "Log",     Icon: Plus     },
  { to: "/routine", label: "Routine", Icon: BarChart3 },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50">
      <div className="max-w-sm mx-auto flex">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                isActive
                  ? "text-stone-950 font-semibold"
                  : "text-stone-400 font-medium"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
