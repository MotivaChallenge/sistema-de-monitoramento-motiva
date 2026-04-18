import { ndviHeatmap, segments } from "@/data/mock";
import { useNavigate } from "react-router-dom";

const colorOf = (s: string) =>
  s === "critico" ? "hsl(var(--destructive))" : s === "atencao" ? "hsl(var(--tertiary))" : "hsl(var(--primary))";

const TOTAL = 29.3;
const markers = [0, 5, 10, 15, 20, 25, 29.3];

export const NDVIHeatmapBar = () => {
  const navigate = useNavigate();
  return (
    <div className="w-full">
      <div className="relative h-3 w-full flex gap-[2px] rounded-full overflow-hidden bg-surface-high">
        {ndviHeatmap.map((s, i) => {
          const w = ((s.to - s.from) / TOTAL) * 100;
          return (
            <div
              key={i}
              style={{ width: `${w}%`, background: colorOf(s.status) }}
              className="h-full"
              title={`KM ${s.from}–${s.to} · ${s.status}`}
            />
          );
        })}
        {/* critical pin dots */}
        {segments.filter(s => s.status === "critico").map((s, i) => {
          const left = (s.kmStart / TOTAL) * 100;
          return (
            <button
              key={i}
              onClick={() => navigate(`/segmento/${s.id}`)}
              style={{ left: `calc(${left}% - 7px)` }}
              className="absolute -top-1.5 h-6 w-6 rounded-full bg-surface-lowest border-2 border-destructive flex items-center justify-center hover:scale-110 transition"
              aria-label={`Ir para ${s.km}`}
            >
              <span className="h-2 w-2 rounded-full bg-destructive" />
            </button>
          );
        })}
      </div>
      <div className="relative mt-2 h-5">
        {markers.map((m) => {
          const left = (m / TOTAL) * 100;
          return (
            <div key={m} style={{ left: `${left}%` }} className="absolute -translate-x-1/2 text-[10px] text-muted-foreground tracking-wider">
              KM {m}
            </div>
          );
        })}
      </div>
    </div>
  );
};
