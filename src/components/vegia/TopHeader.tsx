import { RefreshCw, LogOut, MoreVertical } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { NotificationsPanel } from "./NotificationsPanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSegments } from "@/hooks/useVegiaData";

interface Props {
  breadcrumb?: { label: string; to?: string }[];
  current?: string;
  rightSlot?: React.ReactNode;
  showStatusBadges?: boolean;
  showTabs?: boolean;
  showLastReading?: boolean;
}

export const TopHeader = ({ breadcrumb = [{ label: "RODOANEL SP-021" }], current = "Dashboard", rightSlot, showStatusBadges, showTabs, showLastReading }: Props) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const qc = useQueryClient();
  const { data: segments = [], dataUpdatedAt } = useSegments();
  const criticos = segments.filter(s => s.status === "critico").length;
  const atencao = segments.filter(s => s.status === "atencao").length;
  const lastReading = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "—";
  const refresh = () => { qc.invalidateQueries(); toast.success("Atualizando dados…"); };
  return (
    <header className="h-[72px] px-4 md:px-6 flex items-center justify-between gap-3 bg-background/85 backdrop-blur-md sticky top-0 z-30 border-b border-border/40 overflow-hidden">
      <div className="flex items-center gap-2 text-[12px] tracking-wider min-w-0 shrink overflow-hidden">
        {breadcrumb.map((b, i) => (
          <span key={i} className="text-muted-foreground uppercase font-medium whitespace-nowrap truncate">
            {b.to ? <Link to={b.to} className="hover:text-foreground transition-smooth">{b.label}</Link> : b.label}
            <span className="mx-2 text-border">/</span>
          </span>
        ))}
        <span className="text-primary font-semibold whitespace-nowrap">{current}</span>
      </div>

      {showTabs && (
        <nav className="hidden lg:flex items-center gap-6 text-[12px] tracking-wider font-medium uppercase">
          <Link to="/dashboard" className={pathname==="/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Visão Geral</Link>
          <Link to="/relatorio" className={pathname==="/relatorio" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Trechos</Link>
          <Link to="/analise-cv/5-800" className={pathname.startsWith("/analise-cv") ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Contratos</Link>
        </nav>
      )}

      <div className="flex items-center gap-2 min-w-0 shrink">
        {showStatusBadges && (
          <div className="hidden xl:flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> {criticos} <span className="hidden xl:inline">CRÍTICOS</span><span className="xl:hidden">CRIT</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-tertiary/15 text-tertiary text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> {atencao} <span className="hidden xl:inline">ATENÇÃO</span><span className="xl:hidden">ATEN</span>
            </span>
          </div>
        )}
        {showLastReading && (
          <div className="hidden xl:block text-right leading-tight pl-2">
            <div className="label-md">Última leitura Sentinel-2</div>
            <div className="text-[12px] font-medium">Hoje, {lastReading}</div>
          </div>
        )}
        <NotificationsPanel />
        {/* Desktop ≥ md */}
        <button
          onClick={refresh}
          title="Recarregar"
          aria-label="Recarregar dados"
          className="hidden md:flex h-8 w-8 rounded-full hover:bg-surface-high items-center justify-center text-muted-foreground"
        >
          <RefreshCw className="h-[16px] w-[16px]" />
        </button>
        {user && (
          <button onClick={signOut} title="Sair" aria-label="Sair da conta" className="hidden md:flex h-8 w-8 rounded-full hover:bg-surface-high items-center justify-center text-muted-foreground">
            <LogOut className="h-[16px] w-[16px]" />
          </button>
        )}
        {/* Mobile < md: kebab menu */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              title="Mais ações"
              aria-label="Mais ações"
              className="md:hidden h-8 w-8 rounded-full hover:bg-surface-high flex items-center justify-center text-muted-foreground"
            >
              <MoreVertical className="h-[16px] w-[16px]" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-44 p-1">
            <button
              onClick={refresh}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-foreground hover:bg-surface-high"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" /> Atualizar
            </button>
            {user && (
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-foreground hover:bg-surface-high"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" /> Sair
              </button>
            )}
          </PopoverContent>
        </Popover>
        {rightSlot}
      </div>
    </header>
  );
};
