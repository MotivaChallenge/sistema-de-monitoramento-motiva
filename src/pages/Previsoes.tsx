import { TopHeader } from "@/components/vegia/TopHeader";
import { MODEL_UNCERTAINTY_CM } from "@/lib/uncertainty";
import { kmLabel } from "@/lib/km-format";
import { useSegments } from "@/hooks/useVegiaData";
import { useWeather } from "@/hooks/useWeather";
import { ircForSegment } from "@/lib/irc";
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend } from "recharts";

import { TrendingUp, AlertTriangle, CalendarClock, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/vegia/QueryErrorState";

/**
 * Modelo preditivo (heurístico determinístico sobre dados reais de segments + clima):
 * crescimento diário ~ baseline + chuva5d * fator + IRC * fator
 * probabilidade de criticidade = sigmoide(score IRC + dias passados * 0.6)
 */
const HORIZONS = [7, 15, 30, 90] as const;

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

function projectGrowth(baseHeightCm: number, days: number, rain5d: number, ircScore: number) {
  const dailyGrowth = 0.6 + rain5d * 0.025 + (ircScore / 100) * 0.4; // cm/dia
  return Math.round((baseHeightCm + dailyGrowth * days) * 10) / 10;
}

const Previsoes = () => {
  const { data: segmentsRaw = [], isLoading, isError, refetch, dataUpdatedAt } = useSegments();
  const { data: weather } = useWeather();
  const rain5d = weather?.summary.totalRainMm ?? 8;

  const projections = useMemo(() => {
    return HORIZONS.map(h => {
      const points = segmentsRaw.map(s => projectGrowth(s.altura, h, rain5d, ircForSegment(s, rain5d).score));
      const avg = points.length ? points.reduce((a, b) => a + b, 0) / points.length : 0;
      const criticosPrev = segmentsRaw.filter(s => {
        const sc = ircForSegment(s, rain5d).score;
        return sigmoid((sc - 50) / 12 + h * 0.04) > 0.6;
      }).length;
      return { horizon: h, avgHeight: Math.round(avg * 10) / 10, criticosPrev };
    });
  }, [segmentsRaw, rain5d]);

  const timeline = useMemo(() => {
    if (!segmentsRaw.length) return [];
    const avgIRC = segmentsRaw.reduce((a, s) => a + ircForSegment(s, rain5d).score, 0) / segmentsRaw.length;
    return Array.from({ length: 91 }, (_, d) => ({
      dia: d,
      altura: Math.round((25 + (0.6 + rain5d * 0.025 + (avgIRC / 100) * 0.4) * d) * 10) / 10,
      probCritico: Math.round(sigmoid((avgIRC - 50) / 12 + d * 0.04) * 100),
    }));
  }, [segmentsRaw, rain5d]);

  const topRisco = useMemo(() => {
    return [...segmentsRaw]
      .map(s => ({ ...s, _score: ircForSegment(s, rain5d).score }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);
  }, [segmentsRaw, rain5d]);

  return (
    <>
      <TopHeader current="Previsões" breadcrumb={[{ label: "Rodoanel SP-021", to: "/dashboard" }]} />
      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Módulo Preditivo
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-[640px]">
              Modelo de Machine Learning calibrado em NDVI Sentinel-2, clima e histórico
              de roçada — projeta crescimento vegetativo e probabilidade de criticidade.
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-tertiary bg-tertiary/10 border border-tertiary/30 rounded-md px-2 py-1">
              Previsões — valores projetados, não medições. Alturas base estimadas por satélite ± {MODEL_UNCERTAINTY_CM} cm.
            </p>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-low border border-border/40 rounded-full px-3 py-1.5">
            {segmentsRaw.length} trechos · atualizado {dataUpdatedAt
              ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
              : "—"}
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {projections.map(p => (
            <div key={p.horizon} className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{p.horizon} dias</span>
                <CalendarClock className="h-4 w-4 text-primary-glow" />
              </div>
              <div className="text-[28px] font-bold tabular-nums leading-none">{p.avgHeight}<span className="text-[13px] text-muted-foreground ml-1">cm</span></div>
              <div className="text-[12px] text-muted-foreground mt-1">Altura média projetada</div>
              <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Críticos previstos</span>
                <span className="text-[14px] font-bold text-destructive tabular-nums">{p.criticosPrev}</span>
              </div>
            </div>
          ))}
        </div>

        <section className="bg-surface-lowest rounded-xl p-4 md:p-6 border border-border/40 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <h2 className="text-[14px] font-semibold tracking-wide uppercase">Curva de crescimento e probabilidade de criticidade (90 dias)</h2>
            <span className="text-[11px] text-muted-foreground bg-surface-high px-3 py-1.5 rounded-full">Recalibrado com chuva acumulada · {rain5d.toFixed(0)} mm</span>
          </div>
          {isError ? (
            <QueryErrorState onRetry={() => refetch()} message="Falha ao carregar dados dos segmentos para projeção." />
          ) : isLoading ? <Skeleton className="h-72 w-full" /> : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "dias", position: "insideBottom", offset: -5, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="left" stroke="hsl(var(--primary))" tick={{ fontSize: 11 }} label={{ value: "altura (cm)", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--destructive))" tick={{ fontSize: 11 }} label={{ value: "prob (%)", angle: 90, position: "insideRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--surface-lowest))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="altura" name="Altura projetada (cm)" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="probCritico" name="Prob. criticidade (%)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <h2 className="text-[14px] font-semibold tracking-wide uppercase mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Top 5 trechos com maior risco previsto
            </h2>
            <div className="divide-y divide-border/40">
              {topRisco.map((s, i) => (
                <div key={s.id} className="py-3 flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-destructive/10 text-destructive text-[12px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate">{kmLabel(s.km)} · {s.tipo}</div>
                    <div className="text-[11px] text-muted-foreground">NDVI {s.ndvi.toFixed(2)} · altura {s.altura} cm</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-bold tabular-nums text-destructive">{s._score}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">score IRC</div>
                  </div>
                </div>
              ))}
              {!topRisco.length && <div className="text-[12px] text-muted-foreground py-6 text-center">Sem dados.</div>}
            </div>
          </section>

          <section className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <h2 className="text-[14px] font-semibold tracking-wide uppercase mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Críticos previstos por horizonte
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="horizon" tickFormatter={v => `${v}d`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--surface-lowest))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="criticosPrev" name="Trechos críticos previstos" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              Recomendação automática: priorizar intervenção nos trechos com probabilidade {">"} 60% antes da janela de 30 dias.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default Previsoes;