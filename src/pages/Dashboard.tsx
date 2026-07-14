import { TopHeader } from "@/components/vegia/TopHeader";
import { MetricCard } from "@/components/vegia/MetricCard";
import { AlertCard } from "@/components/vegia/AlertCard";
import { useSegments, useTotalCoverage } from "@/hooks/useVegiaData";
import { WeatherForecast } from "@/components/vegia/WeatherForecast";
import { AIInsightsPanel } from "@/components/vegia/AIInsightsPanel";
import { IRCPanel } from "@/components/vegia/IRCPanel";
import { useWeather } from "@/hooks/useWeather";
import { ircForSegment } from "@/lib/irc";
import { RefreshCw, Inbox, Activity, AlertTriangle, Leaf, Gauge, DollarSign, TrendingDown, Users, CalendarCheck } from "lucide-react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMemo, useState, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilters } from "@/contexts/FiltersContext";
import { GlobalFilters } from "@/components/vegia/GlobalFilters";

const NDVIBarChart = lazy(() => import("@/components/vegia/NDVIBarChart").then(m => ({ default: m.NDVIBarChart })));


const Dashboard = () => {
  const { data: segmentsRaw = [], isLoading, isError: segmentsError } = useSegments();
  const { data: coverage = 0 } = useTotalCoverage();
  const { data: weather } = useWeather();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetching = useIsFetching();
  const [refreshing, setRefreshing] = useState(false);
  const { matches, activeCount } = useFilters();
  const segments = useMemo(
    () => segmentsRaw.filter(s => matches({ status: s.status, kmStart: s.kmStart })),
    [segmentsRaw, matches]
  );

  const total = segments.length;
  const criticos = segments.filter(s => s.status === "critico").length;
  const conformes = segments.filter(s => s.status === "conforme").length;
  const alerts = segments.filter(s => s.status !== "conforme").slice(0, 3);
  const totalAlerts = segments.filter(s => s.status !== "conforme").length;
  const conformidadePct = total ? Math.round((conformes / total) * 100) : 0;
  const ndviAvg = total ? (segments.reduce((a, s) => a + s.ndvi, 0) / total) : 0;
  const rain5d = weather?.summary.totalRainMm ?? 0;
  const ircAvg = total
    ? Math.round(segments.reduce((a, s) => a + ircForSegment(s, rain5d).score, 0) / total)
    : 0;

  // KPIs executivos derivados dos segmentos reais
  const intervencoesProgramadas = segments.filter(s => s.status !== "conforme").length;
  const economiaAnual = Math.round(coverage * 4200 * 12 * 0.28); // R$ economizados com modelo ORION
  const custosEvitados = Math.round(economiaAnual * 0.35);
  const equipesDisponiveis = 3;
  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0, notation: "compact" });


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
        {activeCount > 0 && (
          <div className="text-[12px] text-muted-foreground bg-surface-low border border-border/40 rounded-lg px-3 py-2 inline-flex items-center gap-2 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Mostrando {segments.length} de {segmentsRaw.length} segmentos com filtros ativos.
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <MetricCard icon={Activity} label="Cobertura Total" value={coverage.toFixed(1).replace(".", ",")} unit="km" footer={<div className="h-1.5 rounded-full bg-surface-high overflow-hidden"><div className="h-full w-full rounded-full bg-gradient-primary" /></div>} />
          <MetricCard icon={AlertTriangle} label="Trechos Críticos" value={String(criticos)} unit={`de ${total} segmentos`} variant="danger" footer={
            <div className="h-1.5 rounded-full bg-surface-high">
              <div className="h-full rounded-full bg-destructive transition-smooth" style={{ width: `${total ? (criticos/total)*100 : 0}%` }} />
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
                  background:
                    ircAvg >= 75
                      ? "hsl(var(--destructive))"
                      : ircAvg >= 55
                      ? "hsl(var(--tertiary))"
                      : "hsl(var(--primary))",
                }}
              />
            </div>
          } />
        </div>

        {/* Linha executiva — KPIs financeiros e operacionais para diretoria */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card hover-lift">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Economia estimada/ano</span>
              <DollarSign className="h-4 w-4 text-turquoise" />
            </div>
            <div className="text-[22px] font-bold tabular-nums text-turquoise">{fmtBRL(economiaAnual)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">vs. modelo tradicional</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card hover-lift">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Custos evitados</span>
              <TrendingDown className="h-4 w-4 text-primary-glow" />
            </div>
            <div className="text-[22px] font-bold tabular-nums">{fmtBRL(custosEvitados)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">multas + deslocamentos</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card hover-lift">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Intervenções programadas</span>
              <CalendarCheck className="h-4 w-4 text-tertiary" />
            </div>
            <div className="text-[22px] font-bold tabular-nums">{intervencoesProgramadas}</div>
            <div className="text-[11px] text-muted-foreground mt-1">próximos 14 dias</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card hover-lift">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Equipes disponíveis</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-[22px] font-bold tabular-nums">{equipesDisponiveis}<span className="text-[12px] text-muted-foreground ml-1">/ 5</span></div>
            <div className="text-[11px] text-muted-foreground mt-1">prontas para deslocamento</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">

            <section className="bg-surface-lowest rounded-xl p-4 md:p-6 border border-border/40 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                <h3 className="text-[14px] md:text-[15px] font-semibold tracking-wide uppercase">Tendência NDVI (últimas 6 leituras)</h3>
                <span className="text-[11px] text-muted-foreground bg-surface-high px-3 py-1.5 rounded-full">Junho – Agosto 2024</span>
              </div>
              <Suspense fallback={<Skeleton className="h-72 w-full" />}>
                <NDVIBarChart />
              </Suspense>
            </section>

            <WeatherForecast />

            <IRCPanel />

            <AIInsightsPanel />
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
              {!isLoading && segmentsError && (
                <div className="text-[12px] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>Não foi possível carregar os alertas. Tente novamente.</div>
                </div>
              )}
              {!isLoading && !segmentsError && alerts.length === 0 && (
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
              onClick={() => navigate("/relatorio")}
              className="w-full mt-4 py-3 rounded-lg border border-border text-[12px] font-semibold tracking-wider uppercase text-foreground hover:bg-surface-low hover:border-primary/40 transition-smooth"
            >
              Ver todos os alertas
            </button>
          </aside>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
