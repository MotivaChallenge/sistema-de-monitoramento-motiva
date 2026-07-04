import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Map, TrendingUp, CalendarDays, Users, BarChart3, Settings, LogOut, User, DollarSign, Plug, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAlertsFeed } from "@/hooks/useAlertsFeed";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badgeKey: "alerts" as const },
  { to: "/mapa", label: "Mapa Operacional", icon: Map, match: ["/segmento"] },
  { to: "/previsoes", label: "Previsões", icon: TrendingUp },
  { to: "/planejamento", label: "Planejamento", icon: CalendarDays },
  { to: "/equipes", label: "Equipes", icon: Users },
  { to: "/ordens", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/relatorio", label: "Relatórios", icon: BarChart3 },
  { to: "/roi", label: "Simulador ROI", icon: DollarSign },
  { to: "/integracoes", label: "Integrações", icon: Plug },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

interface SidebarBodyProps { onNavigate?: () => void }

export const SidebarBody = ({ onNavigate }: SidebarBodyProps) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { data: feed = [] } = useAlertsFeed();
  const activeAlerts = feed.filter(a => a.status === "critico" || a.status === "atencao").length;
  return (
    <div className="w-[220px] h-full bg-gradient-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border/50">
      <div className="px-6 pt-7 pb-10 flex items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground font-extrabold text-[15px] ring-2 ring-primary/30 shadow-glow">
            O
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-turquoise ring-2 ring-sidebar" aria-label="Sistema online" />
        </div>
        <div>
          <div className="text-[18px] font-extrabold leading-none tracking-tight">ORION</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60 mt-1">
            Roadside Intelligence
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((it, i) => {
          const active = pathname === it.to || (it.match || []).some(m => pathname.startsWith(m));
          const showBadge = it.badgeKey === "alerts" && activeAlerts > 0;
          return (
            <NavLink
              key={i}
              to={it.to}
              onClick={onNavigate}
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-[14px] font-medium transition-smooth ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              }`}
            >
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-primary-glow to-primary" />}
              <it.icon className={`h-[18px] w-[18px] transition-smooth ${active ? "text-primary-glow" : "group-hover:text-sidebar-foreground"}`} />
              <span className="flex-1">{it.label}</span>
              {showBadge && (
                <span className="ml-auto h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-sm animate-pulse">
                  {activeAlerts > 99 ? "99+" : activeAlerts}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 pb-5 pt-4 border-t border-sidebar-border/60">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent/30 transition-smooth">
          <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate">{user?.user_metadata?.display_name || "Usuário"}</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email ?? "Perfil"}</div>
          </div>
          <button
            onClick={signOut}
            aria-label="Sair"
            title="Sair"
            className="h-8 w-8 rounded-md flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-smooth shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Sidebar = () => (
  <aside className="hidden md:flex shrink-0 h-screen sticky top-0">
    <SidebarBody />
  </aside>
);
