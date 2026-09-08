import { Satellite, Loader2 } from "lucide-react";
import { useLastSatelliteRefresh, useRefreshSatellite } from "@/hooks/useVegiaData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Dispara a releitura Sentinel-2 dos trechos do Rodoanel (SP-021) e mostra
 * quando foi a última atualização. A rotina também roda automaticamente
 * uma vez por semana.
 */
export const SatelliteRefreshButton = ({ className = "" }: { className?: string }) => {
  const refresh = useRefreshSatellite();
  const { data: last } = useLastSatelliteRefresh();

  const lastLabel = last?.finished_at
    ? new Date(last.finished_at as string).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "sem execução registrada";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => refresh.mutate("SP-021")}
            disabled={refresh.isPending}
            aria-label="Atualizar leituras de satélite do Rodoanel"
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border/60 bg-surface-lowest text-[12px] font-medium hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${className}`}
          >
            {refresh.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              : <Satellite className="h-3.5 w-3.5 text-primary" />}
            <span className="hidden md:inline">{refresh.isPending ? "Lendo satélite…" : "Atualizar satélite"}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-[11.5px]">
          Relê o Sentinel-2 (composição mediana dos últimos 60 dias) para os trechos do Rodoanel.
          Última atualização: {lastLabel}. Também executa automaticamente toda semana.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
