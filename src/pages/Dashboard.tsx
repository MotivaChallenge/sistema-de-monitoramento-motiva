import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, CalendarCheck, DollarSign, Gauge, Inbox, Leaf,
  RefreshCw, Sparkles, TrendingDown, Users,
} from "lucide-react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TopHeader } from "@/components/vegia/TopHeader";
import { AutoCarousel } from "@/components/dashboard/AutoCarousel";
import { StatisticCard } from "@/components/dashboard/StatisticCard";
import { InfoBanner } from "@/components/dashboard/InfoBanner";
import { OpsSummaryBar } from "@/components/dashboard/OpsSummaryBar";
import { PriorityList } from "@/components/dashboard/PriorityList";
import { UpcomingMaintenance } from "@/components/dashboard/UpcomingMaintenance";
import { TeamsStatus } from "@/components/dashboard/TeamsStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/vegia/QueryErrorState";
import { MetricCard } from "@/components/vegia/MetricCard";
import { AlertCard } from "@/components/vegia/AlertCard";
import { WeatherForecast } from "@/components/vegia/WeatherForecast";
import { AIChatWidget } from "@/components/vegia/AIChatWidget";
import { GlobalFilters } from "@/components/vegia/GlobalFilters";
import { useFilters } from "@/contexts/FiltersContext";
import { useTotalCoverage } from "@/hooks/useVegiaData";
import { ircForSegment } from "@/lib/irc";
import { useDashboardData } from "@/hooks/useDashboardData";
import { recommendationsFor } from "@/mocks/dashboard";

const NDVIBarChart = lazy(() => import("@/components/vegia/NDVIBarChart").then(m => ({ default: m.NDVIBarChart })));

const Dashboard = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const [refreshing, setRefreshing] = useState(false);
  const { matches, activeCount } = useFilters();

  const {
    segments: allSegments, highlights, rain5d, teamsAvailable, teamsCapacity, isLoading, isError,
  } = useDashboardData();
  const { data: coverage = 0 } = useTotalCoverage();

  const segments = useMemo(
    () => allSegments.filter(s => matches({ status: s.status, kmStart: s.kmStart })),
    [allSegments, matches]
  );

  const total = segments.length;
  const criticos = segments.filter(s => s.status === "critico").length;
  const conformes = segments.filter(s => s.status === "conforme").length;
  const alerts = segments.filter(s => s.status !== "conforme").slice(0, 3);
  const totalAlerts = segments.filter(s => s.status !== "conforme").length;
  const ndviAvg = total ? segments.reduce((a, s) => a + s.ndvi, 0) / total : 0;
  const ircAvg = total
    ? Math.round(segments.reduce((a, s) => a + ircForSegment(s, rain5d).score, 0) / total)
    : 0;
  const conformidadePct = total ? Math.round((conformes / total) * 100) : 0;

  const economiaAnual = Math.round(coverage * 4200 * 12 * 0.28);
  const custosEvitados = Math.round(economiaAnual * 0.35);
  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0, notation: "compact" });

  const recommendations = recommendationsFor(criticos > 0 ? "critico" : totalAlerts > 0 ? "atencao" : "conforme");

  const monitoredPct = allSegments.length ? Math.round((total / allSegments.length) * 100) : 0;
  const lastUpdate = useMemo(() => new Date(), [fetching]);

  return (
    <>
      <TopHeader
        showStatusBadges
        showLastReading
        rightSlot={
          <>
            <GlobalFilters />
            <button
              onClick={async () => {
                setRefreshing(true);
                try {
                  await qc.invalidateQueries();
                  toast.success("Dados atualizados", { description: "Leituras Sentinel-2 sincronizadas." });
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing || fetching > 0}
              aria-label="Atualizar dados"
              className="ml-1 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing || fetching > 0 ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">{refreshing ? "Atualizando" : "Atualizar"}</span> Dados
            </button>
          </>
        }
      />

      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-6">
        {isError && <QueryErrorState onRetry={() => qc.invalidateQueries()} />}

        {activeCount > 0 && (
          <div className="text-[12px] text-muted-foreground bg-surface-low border border-border/40 rounded-lg px-3 py-2 inline-flex items-center gap-2 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Mostrando {segments.length} de {allSegments.length} segmentos com filtros ativos.
          </div>
        )}

        {/* 1 — Situação geral */}
        {isLoading ? (
          <Skeleton className="h-[112px] w-full rounded-xl" />
        ) : (
          <AutoCarousel
            ariaLabel="Situação geral dos trechos"
            interval={5000}
            slides={highlights.map(s => (
              <InfoBanner
                key={s.id}
                status={s.status}
                local={`${s.rodovia ?? "Malha"} · Km ${s.kmStart}`}
                title={`${s.km} — ${s.tipo}`}
                detail={s.insight ?? `Altura ${s.altura} cm (limite ${s.limite} cm) · NDVI ${s.ndvi.toFixed(2).replace(".", ",")}`}
                meta={`Última roçada ${s.ultimaRocada}`}
                onClick={() => navigate(`/segmento/${s.id}`)}
              />
            ))}
          />
        )}

        {/* 2 — Resumo operacional rápido */}
        <OpsSummaryBar
          lastUpdate={lastUpdate}
          monitoredPct={monitoredPct}
          coverageKm={coverage}
          criticos={criticos}
          activeAlerts={totalAlerts}
        />

        {/* 3 — Clima em destaque */}
        <WeatherForecast />

        {/* 4 — Indicadores da malha */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <MetricCard icon={Activity} label="Cobertura Total" value={coverage.toFixed(1).replace(".", ",")} unit="km" footer={<div className="h-1.5 rounded-full bg-surface-high overflow-hidden"><div className="h-full w-full rounded-full bg-gradient-primary" /></div>} />
          <MetricCard icon={AlertTriangle} label="Trechos Críticos" value={String(criticos)} unit={`de ${total} segmentos`} variant="danger" footer={
            <div className="h-1.5 rounded-full bg-surface-high">
              <div className="h-full rounded-full bg-destructive transition-smooth" style={{ width: `${total ? (criticos / total) * 100 : 0}%` }} />
            </div>
          } />
          <MetricCard icon={Leaf} label="NDVI Médio" value={ndviAvg.toFixed(2).replace(".", ",")} unit="global" footer={
            <div className="flex h-1.5 gap-0.5 rounded-full overflow-hidden">
              <div className="flex-1 bg-destructive/30" /><div className="flex-1 bg-tertiary/40" /><div className="flex-[2] bg-primary" />
            </div>
          } />
          <MetricCard icon={Gauge} label="IRC Médio" value={String(ircAvg)} unit="/ 100" variant={ircAvg >= 75 ? "danger" : undefined} footer={
            <div className="h-1.5 rounded-full bg-surface-high">
              <div
                className="h-full rounded-full transition-smooth"
                style={{
                  width: `${ircAvg}%`,
                  background: ircAvg >= 75 ? "hsl(var(--destructive))" : ircAvg >= 55 ? "hsl(var(--tertiary))" : "hsl(var(--primary))",
                }}
              />
            </div>
          } />
        </div>

        {/* 5 — Visão executiva */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <StatisticCard icon={DollarSign} label="Economia estimada/ano" value={fmtBRL(economiaAnual)} hint="vs. modelo tradicional" tone="positive" />
          <StatisticCard icon={TrendingDown} label="Custos evitados" value={fmtBRL(custosEvitados)} hint="multas + deslocamentos" />
          <StatisticCard icon={CalendarCheck} label="Intervenções programadas" value={String(totalAlerts)} hint="próximos 14 dias" tone={totalAlerts > 0 ? "warning" : "positive"} onClick={() => navigate("/planejamento")} />
          <StatisticCard icon={Users} label="Equipes" value={`${teamsAvailable} / ${teamsCapacity}`} hint="Disponíveis para deslocamento" tone="positive" onClick={() => navigate("/equipes")} />
        </div>

        {/* 6 — Painel operacional do dia */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-5">
          <PriorityList segments={segments} rain5d={rain5d} />
          <UpcomingMaintenance />
          <TeamsStatus />
        </div>

        {/* 7 — Análises e alertas */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <section className="bg-surface-lowest rounded-xl p-4 md:p-5 border border-border/40 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-[13px] font-semibold tracking-wider uppercase">Tendência NDVI</h3>
                <span className="text-[11px] text-muted-foreground bg-surface-high px-2.5 py-1 rounded-full">Conformidade {conformidadePct}%</span>
              </div>
              <Suspense fallback={<Skeleton className="h-[140px] w-full" />}>
                <NDVIBarChart height={140} />
              </Suspense>
            </section>
          </div>

          <aside className="bg-surface-lowest rounded-xl p-5 h-fit border border-border/40 shadow-card xl:sticky xl:top-[88px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold tracking-wider uppercase flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                Alertas Ativos
              </h3>
              <span className="text-[11px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-semibold tabular-nums">{totalAlerts}</span>
            </div>
            <div className="space-y-3">
              {isLoading && (
                <>
                  <Skeleton className="h-[120px] w-full" />
                  <Skeleton className="h-[120px] w-full" />
                  <Skeleton className="h-[120px] w-full" />
                </>
              )}
              {!isLoading && alerts.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-turquoise/10 text-turquoise flex items-center justify-center">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">Tudo conforme</p>
                  <p className="text-[11px] mt-1">Nenhum alerta ativo neste momento.</p>
                </div>
              )}
              {alerts.map(a => <AlertCard key={a.id} alert={a} />)}
            </div>
            <button
              onClick={() => navigate("/alertas")}
              className="w-full mt-4 py-3 rounded-lg border border-border text-[12px] font-semibold tracking-wider uppercase text-foreground hover:bg-surface-low hover:border-primary/40 transition-smooth"
            >
              Ver todos os alertas
            </button>
          </aside>
        </div>

        {/* 8 — Recomendações da IA */}
        <div>
          <h2 className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Recomendações da IA
          </h2>
          <AutoCarousel
            ariaLabel="Recomendações geradas por inteligência artificial"
            interval={6000}
            slides={recommendations.map(r => (
              <InfoBanner
                key={r.id}
                status={r.tone}
                local="Sugestão automática"
                title={r.title}
                detail={r.detail}
              />
            ))}
          />
        </div>
      </div>

      <AIChatWidget
        context={{ criticos, total, ircAvg, rain5d, alerts: totalAlerts }}
      />
    </>
  );
};

export default Dashboard;
