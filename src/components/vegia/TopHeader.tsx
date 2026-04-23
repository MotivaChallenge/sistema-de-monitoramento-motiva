import { RefreshCw, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { NotificationsPanel } from "./NotificationsPanel";

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
  return (
    <header className="h-[72px] px-6 flex items-center justify-between gap-4 bg-background">
      <div className="flex items-center gap-2 text-[12px] tracking-wider min-w-0 shrink">
        {breadcrumb.map((b, i) => (
          <span key={i} className="text-muted-foreground uppercase font-medium whitespace-nowrap truncate">
            {b.to ? <Link to={b.to} className="hover:text-foreground">{b.label}</Link> : b.label}
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

      <div className="flex items-center gap-2 shrink-0">
        {showStatusBadges && (
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> 3 <span className="hidden xl:inline">CRÍTICOS</span><span className="xl:hidden">CRIT</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-tertiary/15 text-tertiary text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> 7 <span className="hidden xl:inline">ATENÇÃO</span><span className="xl:hidden">ATEN</span>
            </span>
          </div>
        )}
        {showLastReading && (
          <div className="hidden xl:block text-right leading-tight pl-2">
            <div className="label-md">Última leitura Sentinel-2</div>
            <div className="text-[12px] font-medium">Hoje, 09:42 (UTC-3)</div>
          </div>
        )}
        <NotificationsPanel />
        <button
          onClick={() => { qc.invalidateQueries(); toast.success("Atualizando dados…"); }}
          title="Recarregar"
          className="h-8 w-8 rounded-full hover:bg-surface-high flex items-center justify-center text-muted-foreground"
        >
          <RefreshCw className="h-[16px] w-[16px]" />
        </button>
        {user && (
          <button onClick={signOut} title="Sair" className="h-8 w-8 rounded-full hover:bg-surface-high flex items-center justify-center text-muted-foreground">
            <LogOut className="h-[16px] w-[16px]" />
          </button>
        )}
        {rightSlot}
      </div>
    </header>
  );
};
