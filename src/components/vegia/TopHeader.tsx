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
    <header className="h-[88px] px-10 flex items-center justify-between bg-background">
      <div className="flex items-center gap-3 text-[13px] tracking-wider">
        {breadcrumb.map((b, i) => (
          <span key={i} className="text-muted-foreground uppercase font-medium">
            {b.to ? <Link to={b.to} className="hover:text-foreground">{b.label}</Link> : b.label}
            <span className="mx-3 text-border">/</span>
          </span>
        ))}
        <span className="text-primary font-semibold">{current}</span>
      </div>

      {showTabs && (
        <nav className="flex items-center gap-8 text-[12px] tracking-wider font-medium uppercase">
          <Link to="/dashboard" className={pathname==="/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Visão Geral</Link>
          <Link to="/relatorio" className={pathname==="/relatorio" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Trechos</Link>
          <Link to="/analise-cv/5-800" className={pathname.startsWith("/analise-cv") ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Contratos</Link>
        </nav>
      )}

      <div className="flex items-center gap-5">
        {showStatusBadges && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-[12px] font-semibold flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> 3 CRÍTICOS
            </span>
            <span className="px-3 py-1.5 rounded-full bg-tertiary/15 text-tertiary text-[12px] font-semibold flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> 7 ATENÇÃO
            </span>
          </div>
        )}
        {showLastReading && (
          <div className="text-right leading-tight">
            <div className="label-md">Última leitura Sentinel-2</div>
            <div className="text-[13px] font-medium">Hoje, 09:42 (UTC-3)</div>
          </div>
        )}
        <NotificationsPanel />
        <button
          onClick={() => { qc.invalidateQueries(); toast.success("Atualizando dados…"); }}
          title="Recarregar"
          className="h-9 w-9 rounded-full hover:bg-surface-high flex items-center justify-center text-muted-foreground"
        >
          <RefreshCw className="h-[18px] w-[18px]" />
        </button>
        {user && (
          <button onClick={signOut} title="Sair" className="h-9 w-9 rounded-full hover:bg-surface-high flex items-center justify-center text-muted-foreground">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        )}
        {rightSlot}
      </div>
    </header>
  );
};
