import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Map, TrendingUp, CalendarDays, Users, BarChart3, Settings, LogOut, User, ClipboardList, PanelLeftClose, PanelLeftOpen, FlaskConical, Database, ChevronDown, Plus, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveAlertsCount } from "@/hooks/useAlertsFeed";
import { useWorkOrders } from "@/hooks/useVegiaData";
import motivaLogo from "@/assets/motiva-logo.webp.asset.json";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Item = {
  to: string;
  label: string;
  icon: React.ElementType;
  match?: string[];
  badgeKey?: "alerts" | "orders";
  children?: Item[];
};

type Group = { id: string; label: string; defaultCollapsed?: boolean; items: Item[] };

const groups: Group[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badgeKey: "alerts" },
      { to: "/mapa", label: "Mapa Operacional", icon: Map, match: ["/segmento", "/analise-cv"] },
      { to: "/ordens", label: "Ordens de Serviço", icon: ClipboardList, badgeKey: "orders" },
    ],
  },
  {
    id: "planejamento",
    label: "Planejamento",
    items: [
      {
        to: "/planejamento",
        label: "Planejamento",
        icon: CalendarDays,
        children: [
          { to: "/previsoes", label: "Previsões", icon: TrendingUp },
          { to: "/equipes", label: "Equipes", icon: Users },
        ],
      },
      { to: "/relatorio", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    id: "ferramentas",
    label: "Análise Técnica",
    defaultCollapsed: true,
    items: [
      { to: "/prototipo", label: "Validação de Modelo", icon: FlaskConical },
      { to: "/dataset", label: "Simulação de Dados", icon: Database },
    ],
  },
];

const GROUP_KEY = "sidebar-groups-open";

interface SidebarBodyProps { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }

export const SidebarBody = ({ onNavigate, collapsed = false, onToggle }: SidebarBodyProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user, canEdit } = useAuth();
  const { data: activeAlerts = 0 } = useActiveAlertsCount();
  const { data: workOrders = [] } = useWorkOrders();
  const pendingOrders = workOrders.filter(o => o.status === "pendente").length;

  const isActive = (it: Item) => pathname === it.to || (it.match ?? []).some(m => pathname.startsWith(m));
  const groupHasActive = (g: Group) =>
    g.items.some(it => isActive(it) || (it.children ?? []).some(c => isActive(c)));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    let stored: Record<string, boolean> = {};
    try { stored = JSON.parse(localStorage.getItem(GROUP_KEY) ?? "{}"); } catch { /* noop */ }
    return Object.fromEntries(
      groups.map(g => [g.id, stored[g.id] ?? (!g.defaultCollapsed || groupHasActive(g))]),
    );
  });

  useEffect(() => {
    localStorage.setItem(GROUP_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  // Abre automaticamente o grupo que contém a rota ativa.
  useEffect(() => {
    const g = groups.find(gr => groupHasActive(gr));
    if (g) setOpenGroups(prev => (prev[g.id] ? prev : { ...prev, [g.id]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const badgeFor = (it: Item) =>
    it.badgeKey === "alerts" ? activeAlerts : it.badgeKey === "orders" ? pendingOrders : 0;

  const renderLink = (it: Item, opts: { sub?: boolean } = {}) => {
    const active = isActive(it);
    const count = badgeFor(it);
    const showBadge = count > 0;
    const danger = it.badgeKey === "alerts";
    const link = (
      <NavLink
        to={it.to}
        onClick={onNavigate}
        aria-label={it.label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center rounded-2xl transition-all duration-200",
          opts.sub ? "text-[13px] font-normal" : "text-[14px] font-medium",
          collapsed ? "justify-center h-11 w-11 mx-auto" : opts.sub ? "gap-3 pl-10 pr-3 py-2" : "gap-3 px-4 py-2.5",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:translate-x-0.5",
        )}
      >
        {active && !collapsed && (
          <span className="absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-primary-glow to-primary" />
        )}
        <span className="relative shrink-0">
          <it.icon
            className={cn(
              "transition-colors",
              opts.sub ? "h-4 w-4" : "h-[18px] w-[18px]",
              active ? "text-primary-glow" : "group-hover:text-sidebar-foreground",
            )}
          />
          {showBadge && collapsed && (
            <span className={cn("absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full", danger ? "bg-destructive animate-pulse" : "bg-primary-glow")} />
          )}
        </span>
        {!collapsed && <span className="flex-1 whitespace-nowrap truncate">{it.label}</span>}
        {showBadge && !collapsed && (
          <span
            className={cn(
              "ml-auto h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm",
              danger ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-sidebar-accent text-sidebar-foreground",
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </NavLink>
    );
    return collapsed ? (
      <Tooltip key={it.to} delayDuration={100}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{it.label}</TooltipContent>
      </Tooltip>
    ) : (
      <div key={it.to}>{link}</div>
    );
  };

  return (
    <div
      className={cn(
        "h-[calc(100vh-16px)] my-2 ml-2 bg-gradient-sidebar text-sidebar-foreground flex flex-col border border-sidebar-border/40 overflow-hidden rounded-3xl shadow-2xl",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <div className={cn("pt-5 pb-6 flex items-center gap-3", collapsed ? "px-3 justify-center" : "px-5")}>
        <div className="relative shrink-0">
          <img
            src={motivaLogo.url}
            alt="Motiva"
            className="h-11 w-11 rounded-2xl object-contain shadow-glow transition-transform duration-300 hover:scale-105"
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

      {canEdit && (
        <div className={cn("pb-4", collapsed ? "px-3" : "px-4")}>
          {collapsed ? (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { navigate("/ordens?new=1"); onNavigate?.(); }}
                  aria-label="Nova ordem de serviço"
                  className="h-11 w-11 mx-auto flex items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 hover:scale-105 transition-all"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Nova ordem de serviço</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => { navigate("/ordens?new=1"); onNavigate?.(); }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary text-primary-foreground text-[13px] font-semibold py-3 shadow-glow hover:opacity-90 hover:scale-[1.02] transition-all"
            >
              <Plus className="h-4 w-4" /> Nova ordem de serviço
            </button>
          )}
        </div>
      )}

      <nav className="flex-1 px-3 overflow-y-auto space-y-5">
        {groups.map(g => {
          const open = openGroups[g.id] ?? true;
          return (
            <div key={g.id} className="space-y-2">
              {collapsed ? (
                <div className="h-px bg-sidebar-border/60 mx-2 my-2" />
              ) : (
                <button
                  onClick={() => setOpenGroups(prev => ({ ...prev, [g.id]: !open }))}
                  aria-expanded={open}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-sidebar-foreground/45 hover:text-sidebar-foreground/70 transition-colors rounded-xl hover:bg-sidebar-accent/20"
                >
                  <span className="flex-1 text-left">{g.label}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open ? "" : "-rotate-90")} />
                </button>
              )}
              {(open || collapsed) && (
                <div className="space-y-1.5 animate-fade-in">
                  {g.items.map(it => (
                    <div key={it.to} className="space-y-1">
                      {renderLink(it)}
                      {!collapsed && (it.children ?? []).map(c => renderLink(c, { sub: true }))}
                      {collapsed && (it.children ?? []).map(c => renderLink(c))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-1">
          {collapsed && <div className="h-px bg-sidebar-border/60 mx-2 mb-2" />}
          {renderLink({ to: "/configuracoes", label: "Configurações", icon: Settings })}
        </div>
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
