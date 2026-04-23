import { useMemo } from "react";
import { Activity } from "lucide-react";
import { useSegments } from "@/hooks/useVegiaData";
import { useWeather } from "@/hooks/useWeather";
import { ircForSegment, ircLevelClass, ircLevelLabel } from "@/lib/irc";

export const IRCPanel = () => {
  const { data: segments = [] } = useSegments();
  const { data: weather } = useWeather();
  const rain5d = weather?.summary.totalRainMm ?? 0;

  const rows = useMemo(
    () =>
      segments
        .map((s) => ({ s, irc: ircForSegment(s, rain5d) }))
        .sort((a, b) => b.irc.score - a.irc.score)
        .slice(0, 6),
    [segments, rain5d],
  );

  const avg =
    rows.length > 0
      ? Math.round(
          segments.reduce((acc, s) => acc + ircForSegment(s, rain5d).score, 0) / segments.length,
        )
      : 0;

  return (
    <section className="bg-surface-lowest rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold tracking-wide uppercase flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Índice de Risco de Crescimento (IRC)
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Média da rede</span>
          <span className="text-[18px] font-bold text-primary">{avg}</span>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground mb-4 max-w-3xl">
        Combina NDVI, altura vs. limite contratual, dias desde a última roçada e chuva prevista (5 dias)
        para priorizar trechos com maior risco de descumprimento.
      </p>

      <div className="space-y-2">
        {rows.map(({ s, irc }) => (
          <div key={s.id} className="flex items-center gap-4">
            <div className="w-24 text-[12px] font-mono text-muted-foreground">{s.km}</div>
            <div className="flex-1 h-2 rounded-full bg-surface-high overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${irc.score}%`,
                  background:
                    irc.level === "critico"
                      ? "hsl(var(--destructive))"
                      : irc.level === "alto"
                      ? "hsl(var(--tertiary))"
                      : irc.level === "moderado"
                      ? "hsl(var(--primary))"
                      : "hsl(var(--turquoise))",
                }}
              />
            </div>
            <div className="w-12 text-right text-[13px] font-semibold tabular-nums">{irc.score}</div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${ircLevelClass(
                irc.level,
              )}`}
            >
              {ircLevelLabel[irc.level]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};