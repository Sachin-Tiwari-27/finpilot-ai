import { NavLink } from "react-router-dom";
import { useStore } from "@/store";
import { formatINRCompact } from "@/utils";
import { cn } from "@/utils";

const NAV_ITEMS = [
  { path: "/dashboard", icon: "⬡", label: "Dashboard" },
  { path: "/transactions", icon: "↔", label: "Transactions" },
  { path: "/budget", icon: "◉", label: "Budget" },
  { path: "/portfolio", icon: "◈", label: "Portfolio" },
  { path: "/research", icon: "⊕", label: "Research" },
  { path: "/insights", icon: "◆", label: "AI Insights" },
  { path: "/goals", icon: "◎", label: "Goals" },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, healthScore } = useStore();

  return (
    <aside
      className={cn(
        "flex flex-col flex-shrink-0 bg-fp-surface border-r border-fp-border/40 transition-all duration-300",
        sidebarOpen ? "w-52" : "w-16",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-fp-border/30">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fp-primary to-fp-accent flex items-center justify-center flex-shrink-0 text-sm">
          📊
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-fp-text leading-none">
              FinPilot
            </div>
            <div className="text-[10px] text-fp-primary font-medium mt-0.5">
              AI Finance
            </div>
          </div>
        )}
      </div>

      {/* Health Score Badge */}
      {healthScore && sidebarOpen && (
        <div className="mx-3 mt-3 p-2.5 rounded-xl bg-fp-card border border-fp-border/40">
          <div className="text-[10px] text-fp-text-3 mb-1">Health Score</div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold text-fp-primary">
              {healthScore.score}
            </div>
            <div className="flex-1 h-1.5 bg-fp-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fp-primary to-fp-accent rounded-full transition-all"
                style={{ width: `${healthScore.score}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                isActive
                  ? "bg-fp-primary/10 text-fp-primary border border-fp-primary/20"
                  : "text-fp-text-2 hover:bg-fp-card hover:text-fp-text",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "text-base flex-shrink-0 w-5 text-center transition-colors",
                    isActive
                      ? "text-fp-primary"
                      : "text-fp-text-3 group-hover:text-fp-text-2",
                  )}
                >
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">
                    {item.label}
                  </span>
                )}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-fp-primary flex-shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Settings + Collapse */}
      <div className="px-2 py-3 border-t border-fp-border/30 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
              isActive
                ? "bg-fp-primary/10 text-fp-primary"
                : "text-fp-text-2 hover:bg-fp-card hover:text-fp-text",
            )
          }
        >
          <span className="text-base flex-shrink-0 w-5 text-center">⚙</span>
          {sidebarOpen && <span className="text-sm font-medium">Settings</span>}
        </NavLink>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-fp-text-3 hover:text-fp-text hover:bg-fp-card transition-all"
        >
          <span className="text-base flex-shrink-0 w-5 text-center">
            {sidebarOpen ? "◁" : "▷"}
          </span>
          {sidebarOpen && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
