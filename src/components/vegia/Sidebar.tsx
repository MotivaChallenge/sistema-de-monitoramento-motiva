import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Map, TrendingUp, CalendarDays, Users, BarChart3, Settings, LogOut, User, ClipboardList, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveAlertsCount } from "@/hooks/useAlertsFeed";
import motivaLogo from "@/assets/motiva-logo.webp.asset.json";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badgeKey: "alerts" as const },
  { to: "/mapa", label: "Mapa Operacional", icon: Map, match: ["/segmento"] },
  { to: "/previsoes", label: "Previsões", icon: TrendingUp },
  { to: "/planejamento", label: "Planejamento", icon: CalendarDays },
  { to: "/equipes", label: "Equipes", icon: Users },
  { to: "/ordens", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/relatorio", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

interface SidebarBodyProps { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }

export const SidebarBody = ({ onNavigate, collapsed = false, onToggle }: SidebarBodyProps) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { data: activeAlerts = 0 } = useActiveAlertsCount();

  return (
    <div
      className={cn(
        "h-full bg-gradient-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border/50 overflow-hidden",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[76px]" : "w-[240px]",
      )}
    >
      <div className={cn("pt-6 pb-8 flex items-center gap-3", collapsed ? "px-4 justify-center" : "px-5")}>
        <div className="relative shrink-0">
          <img
            src={motivaLogo.url}
            alt="Motiva"
            className="h-10 w-10 rounded-xl object-contain shadow-glow transition-transform duration-300 hover:scale-105"
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-turquoise ring-2 ring-sidebar" aria-label="Sistema online" />
        </div>
        <div
          className={cn(
            "min-w-0 transition-all duration-200",
            collapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100",
          )}
        >
          <div className="text-[18px] font-extrabold leading-none tracking-tight whitespace-nowrap">Motiva</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60 mt-1 whitespace-nowrap">
            Monitoramento
          </div>
        </div>
      </div>

      <nav className={cn("flex-1 space-y-1", collapsed ? "px-3" : "px-3")}>
        {items.map((it, i) => {
          const active = pathname === it.to || (it.match || []).some(m => pathname.startsWith(m));
          const showBadge = it.badgeKey === "alerts" && activeAlerts > 0;
          const link = (
            <NavLink
              to={it.to}
              onClick={onNavigate}
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center rounded-xl text-[14px] font-medium transition-all duration-200",
                collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-4 py-2.5",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:translate-x-0.5",
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-primary-glow to-primary" />
              )}
              <span className="relative shrink-0">
                <it.icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-primary-glow" : "group-hover:text-sidebar-foreground")} />
                {showBadge && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                )}
              </span>
              {!collapsed && <span className="flex-1 whitespace-nowrap">{it.label}</span>}
              {showBadge && !collapsed && (
                <span className="ml-auto h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-sm animate-pulse">
                  {activeAlerts > 99 ? "99+" : activeAlerts}
                </span>
              )}
            </NavLink>
          );
          return collapsed ? (
            <Tooltip key={i} delayDuration={100}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{it.label}</TooltipContent>
            </Tooltip>
          ) : (
            <div key={i}>{link}</div>
          );
        })}
      </nav>

      {onToggle && (
        <div className={cn("pb-2", collapsed ? "px-3" : "px-4")}>
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "flex items-center gap-2 rounded-xl text-[12px] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-200",
              collapsed ? "h-10 w-10 justify-center mx-auto" : "w-full px-3 py-2",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Recolher</>}
          </button>
        </div>
      )}

      <div className={cn("pb-5 pt-3 border-t border-sidebar-border/60", collapsed ? "px-3" : "px-3")}>
        <div className={cn("flex items-center rounded-xl hover:bg-sidebar-accent/30 transition-smooth", collapsed ? "flex-col gap-2 py-2" : "gap-3 px-2 py-2")}>
          <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
            <User className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate">{user?.user_metadata?.display_name || "Usuário"}</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email ?? "Perfil"}</div>
            </div>
          )}
          <button
            onClick={signOut}
            aria-label="Sair"
            title="Sair"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-smooth shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "1");
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);
  return (
    <aside className="hidden md:flex shrink-0 h-screen sticky top-0">
      <SidebarBody collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
    </aside>
  );
};
