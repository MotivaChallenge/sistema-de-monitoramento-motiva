import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { useWorkOrders, type WorkOrderPriority } from "@/hooks/useVegiaData";
import { Skeleton } from "@/components/ui/skeleton";

const priorityClass: Record<WorkOrderPriority, string> = {
  baixa: "bg-surface-high text-muted-foreground",
  media: "bg-primary/10 text-primary",
  alta: "bg-tertiary/15 text-tertiary",
  critica: "bg-destructive/15 text-destructive",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "A definir";

export const UpcomingMaintenance = ({ limit = 5 }: { limit?: number }) => {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useWorkOrders();

  const rows = useMemo(
    () =>
      orders
        .filter(o => o.status === "pendente" || o.status === "em_andamento")
        .sort((a, b) => {
          const av = a.scheduled_for ? new Date(a.scheduled_for).getTime() : Number.MAX_SAFE_INTEGER;
          const bv = b.scheduled_for ? new Date(b.scheduled_for).getTime() : Number.MAX_SAFE_INTEGER;
          return av - bv;
        })
        .slice(0, limit),
    [orders, limit]
  );

  return (
    <section className="bg-surface-lowest rounded-xl p-4 md:p-5 border border-border/40 shadow-card h-full flex flex-col">
      <h3 className="text-[13px] font-semibold tracking-wider uppercase flex items-center gap-2 mb-3">
        <CalendarClock className="h-3.5 w-3.5 text-primary" /> Próximas manutenções
      </h3>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="text-[12px] text-muted-foreground py-6 text-center">Nenhuma ordem programada.</p>
      )}

      <ul className="space-y-1 flex-1">
        {rows.map(o => (
          <li key={o.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-low transition-smooth">
            <span className="text-[11px] font-mono text-muted-foreground w-14 shrink-0">{fmtDate(o.scheduled_for)}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-semibold truncate">{o.tipo_servico}</span>
              <span className="block text-[11px] text-muted-foreground truncate">{o.code}</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${priorityClass[o.priority]}`}>
              {o.priority}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => navigate("/ordens")}
        className="w-full mt-3 py-2 rounded-lg border border-border text-[11px] font-semibold tracking-wider uppercase hover:bg-surface-low hover:border-primary/40 transition-smooth"
      >
        Ver ordens de serviço
      </button>
    </section>
  );
};