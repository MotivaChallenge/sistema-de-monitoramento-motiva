import { RefreshCw, Menu } from "lucide-react";
import { useMobileMenu } from "@/contexts/MobileMenuContext";
import { Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { NotificationsPanel } from "./NotificationsPanel";
import { useSegments } from "@/hooks/useVegiaData";

interface Props {
  breadcrumb?: { label: string; to?: string }[];
  current?: string;
  rightSlot?: React.ReactNode;
  showStatusBadges?: boolean;
  showTabs?: boolean;
  showLastReading?: boolean;
}

export const TopHeader = ({ breadcrumb = [{ label: "Rodoanel SP-021" }], current = "Dashboard", rightSlot, showStatusBadges, showTabs, showLastReading }: Props) => {
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const { setOpen } = useMobileMenu();
  const { data: segments = [], dataUpdatedAt } = useSegments();
  const criticos = segments.filter(s => s.status === "critico").length;
  const atencao = segments.filter(s => s.status === "atencao").length;
  // Usa sempre um segmento real existente (o primeiro crítico, se houver).
  const analysisSegment = segments.find(s => s.status === "critico") ?? segments[0];
  const analysisTo = analysisSegment ? `/analise-cv/${analysisSegment.id}` : "/relatorio";
  const lastReading = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "aguardando processamento";
  const refresh = () => { qc.invalidateQueries(); toast.success("Atualizando dados…"); };
  return (
    <header className="h-14 md:h-16 px-3 md:px-6 flex items-center justify-between gap-2 bg-background/92 backdrop-blur-md sticky top-0 z-30 border-b border-border/60 overflow-hidden">
      <div className="flex items-center gap-1.5 text-[11px] tracking-wider min-w-0 flex-1 overflow-hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="md:hidden h-9 w-9 -ml-1 shrink-0 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-surface-low transition-smooth"
        >
          <Menu className="h-4 w-4" />
        </button>
        {breadcrumb.map((b, i) => (
          <span key={i} className="hidden md:inline text-muted-foreground uppercase font-medium whitespace-nowrap truncate">
            {b.to ? <Link to={b.to} className="hover:text-foreground transition-smooth">{b.label}</Link> : b.label}
            <span className="mx-1.5 text-border">/</span>
          </span>
        ))}
        <span className="text-primary font-semibold truncate">{current}</span>
      </div>


      {showTabs && (
        <nav className="hidden lg:flex items-center gap-6 text-[12px] tracking-wider font-medium uppercase">
          <Link to="/dashboard" className={pathname==="/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Visão Geral</Link>
          <Link to="/relatorio" className={pathname==="/relatorio" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Trechos</Link>
          <Link to={analysisTo} className={pathname.startsWith("/analise-cv") ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Análise visual</Link>
        </nav>
      )}

      <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
        {showStatusBadges && (
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> {criticos} <span className="hidden 2xl:inline">CRÍTICOS</span><span className="2xl:hidden">CRIT</span>
            </span>
            <span className="px-2 py-1 rounded-full bg-tertiary/15 text-tertiary text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> {atencao} <span className="hidden 2xl:inline">ATENÇÃO</span><span className="2xl:hidden">ATEN</span>
            </span>
          </div>
        )}
        {showLastReading && (
          <div className="hidden xl:block text-right leading-tight px-1.5 whitespace-nowrap">
            <div className="text-[9px] uppercase text-muted-foreground">Sentinel-2</div>
            <div className="text-[11px] font-medium">Hoje, {lastReading}</div>
          </div>
        )}
        <NotificationsPanel />
        <button
          onClick={refresh}
          title="Recarregar"
          aria-label="Recarregar dados"
           className="flex h-8 w-8 rounded-md hover:bg-surface-high items-center justify-center text-muted-foreground shrink-0"
        >
          <RefreshCw className="h-[16px] w-[16px]" />
        </button>
        {rightSlot}
      </div>
    </header>
  );
};
