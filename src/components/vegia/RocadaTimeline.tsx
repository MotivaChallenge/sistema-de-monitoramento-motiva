import { useRocadaEvents } from "@/hooks/useOperator";
import { Scissors, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fmt = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });

export const RocadaTimeline = ({ segmentId }: { segmentId: string }) => {
  const { data: events = [], isLoading } = useRocadaEvents(segmentId);

  return (
    <section className="bg-surface-lowest rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold tracking-wider uppercase flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico de Roçadas
        </h3>
        {events.length > 0 && (
          <span className="label-md">{events.length} evento{events.length > 1 ? "s" : ""}</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Nenhuma roçada registrada ainda. Operadores podem registrar via painel ao lado.
        </p>
      ) : (
        <ol className="relative border-l border-border/60 ml-2">
          {events.map((e, i) => {
            const days = Math.floor(
              (Date.now() - new Date(e.data + "T00:00:00").getTime()) / 86400000
            );
            return (
              <li key={e.id} className="ml-5 pb-5 last:pb-0">
                <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 ring-2 ring-background">
                  <Scissors className="h-2.5 w-2.5 text-primary" />
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-semibold">{fmt(e.data)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {i === 0 ? `há ${days} dia${days === 1 ? "" : "s"}` : ""}
                  </span>
                </div>
                {e.responsavel && (
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    Responsável: <span className="text-foreground/80">{e.responsavel}</span>
                  </div>
                )}
                {e.observacao && (
                  <p className="text-[12px] text-foreground/70 mt-1 italic">{e.observacao}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};