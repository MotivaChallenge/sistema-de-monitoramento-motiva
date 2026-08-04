import { useNdviTrend } from "@/hooks/useVegiaData";
import { Skeleton } from "@/components/ui/skeleton";

export const NDVIBarChart = ({ height = 200 }: { height?: number }) => {
  const max = 0.8;
  const { data: ndviTrend = [], isLoading } = useNdviTrend();
  if (isLoading) return <Skeleton style={{ height }} className="w-full" />;
  if (!ndviTrend.length) return (
    <div style={{ height }} className="flex items-center justify-center text-[12px] text-muted-foreground">
      Sem leituras suficientes ainda.
    </div>
  );
  return (
    <div className="grid gap-3 items-end" style={{ height, gridTemplateColumns: `repeat(${ndviTrend.length}, minmax(0, 1fr))` }}>
      {ndviTrend.map((d, i) => {
        const h = (d.value / max) * 100;
        const last = i === ndviTrend.length - 1;
        return (
          <div key={d.label} className="flex flex-col items-center gap-2 h-full justify-end">
            <span className={`text-[11px] font-semibold ${last ? "text-primary" : "text-muted-foreground"}`}>{d.value.toFixed(2)}</span>
            <div
              style={{ height: `${h}%` }}
              className={`w-full rounded-t ${last ? "bg-primary" : "bg-primary/40"}`}
            />
            <span className={`text-[11px] tracking-wider ${last ? "text-primary font-semibold" : "text-muted-foreground"}`}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};
