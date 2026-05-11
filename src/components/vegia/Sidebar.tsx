import { NavLink, useLocation } from "react-router-dom";
import { Map, Bell, BarChart3, Settings, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoMotiva from "@/assets/motiva-logo.png";
import { useAlertsFeed } from "@/hooks/useAlertsFeed";

const items = [
  { to: "/dashboard", label: "Mapa", icon: Map, match: ["/segmento"] },
  { to: "/alertas", label: "Alertas", icon: Bell, badgeKey: "alerts" as const },
  { to: "/relatorio", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

interface SidebarBodyProps { onNavigate?: () => void }

export const SidebarBody = ({ onNavigate }: SidebarBodyProps) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { data: feed = [] } = useAlertsFeed();
  const activeAlerts = feed.filter(a => a.status === "critico" || a.status === "atencao").length;
  return (
    <div className="w-[220px] h-full bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="px-6 pt-7 pb-10 flex items-center gap-3">
        <img src={logoMotiva} alt="Motiva" className="h-10 w-10 rounded-full" />
        <div>
          <div className="text-[18px] font-extrabold leading-none tracking-tight">Motiva</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60 mt-1">
            Rodovias · Vegia
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
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-md text-[14px] font-medium transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
              }`}
            >
              {active && <span className="absolute right-0 top-1 bottom-1 w-[3px] rounded-full bg-primary-glow" />}
              <it.icon className={`h-[18px] w-[18px] ${active ? "text-primary-glow" : ""}`} />
              <span className="flex-1">{it.label}</span>
              {showBadge && (
                <span className="ml-auto h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
                  {activeAlerts > 99 ? "99+" : activeAlerts}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 pb-6 pt-4 space-y-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-full bg-primary/25 flex items-center justify-center text-primary-glow">
            <User className="h-4 w-4" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-[13px] font-semibold truncate">{user?.user_metadata?.display_name || "Usuário"}</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email ?? "Perfil"}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          aria-label="Sair"
          className="flex items-center gap-3 px-2 text-[13px] text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
};

export const Sidebar = () => (
  <aside className="hidden md:flex shrink-0 h-screen sticky top-0">
    <SidebarBody />
  </aside>
);
