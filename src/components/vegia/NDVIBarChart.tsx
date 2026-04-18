import { ndviTrend } from "@/data/mock";

export const NDVIBarChart = () => {
  const max = 0.8;
  return (
    <div className="grid grid-cols-6 gap-6 items-end h-[200px]">
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
