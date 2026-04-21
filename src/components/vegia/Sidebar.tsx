import { NavLink, useLocation } from "react-router-dom";
import { Map, Bell, BarChart3, Settings, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const items = [
  { to: "/dashboard", label: "Mapa", icon: Map },
  { to: "/relatorio", label: "Alertas", icon: Bell, match: ["/segmento"] },
  { to: "/relatorio", label: "Relatórios", icon: BarChart3 },
];

export const Sidebar = () => {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  return (
    <aside className="w-[220px] shrink-0 bg-surface-low flex flex-col h-screen sticky top-0">
      <div className="px-6 pt-7 pb-10">
        <div className="text-[22px] font-bold leading-none tracking-tight">
          Vegia<span className="text-primary">Map</span>
        </div>
        <div className="label-md mt-1">Infrastructure<br/>Monitoring</div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((it, i) => {
          const active = pathname.startsWith(it.to) || (it.match || []).some(m => pathname.startsWith(m));
          return (
            <NavLink
              key={i}
              to={it.to}
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-md text-[14px] font-medium transition-colors ${
                active ? "bg-surface-high text-foreground" : "text-foreground/75 hover:bg-surface-high/60"
              }`}
            >
              {active && <span className="absolute right-0 top-1 bottom-1 w-[3px] rounded-full bg-primary" />}
              <it.icon className={`h-[18px] w-[18px] ${active ? "text-primary" : ""}`} />
              {it.label}
            </NavLink>
          );
        })}
        <button
          onClick={() => toast("Configurações em breve")}
          className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-md text-[14px] font-medium text-foreground/75 hover:bg-surface-high/60"
        >
          <Settings className="h-[18px] w-[18px]" /> Configurações
        </button>
      </nav>

      <div className="px-4 pb-6 pt-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">Eng. Marcelo</div>
            <div className="text-[11px] text-muted-foreground">Perfil</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-2 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  );
};
