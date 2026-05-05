import { TopHeader } from "@/components/vegia/TopHeader";
import { MetricCard } from "@/components/vegia/MetricCard";
import { AlertCard } from "@/components/vegia/AlertCard";
import { useSegments, useKmMarkers } from "@/hooks/useVegiaData";
import { WeatherForecast } from "@/components/vegia/WeatherForecast";
import { AIInsightsPanel } from "@/components/vegia/AIInsightsPanel";
import { IRCPanel } from "@/components/vegia/IRCPanel";
import { useWeather } from "@/hooks/useWeather";
import { ircForSegment } from "@/lib/irc";
import { RefreshCw, Inbox } from "lucide-react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMemo, useState, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilters } from "@/contexts/FiltersContext";
import { GlobalFilters } from "@/components/vegia/GlobalFilters";

// Code splitting: mapa Leaflet e gráficos Recharts são pesados — carrega só quando precisa.
const OSMMap = lazy(() => import("@/components/vegia/OSMMap").then(m => ({ default: m.OSMMap })));
const NDVIBarChart = lazy(() => import("@/components/vegia/NDVIBarChart").then(m => ({ default: m.NDVIBarChart })));

const Dashboard = () => {
  const { data: segmentsRaw = [], isLoading, isError: segmentsError } = useSegments();
  const { data: kmMarkers = [] } = useKmMarkers();
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

  // Build OSM data from real km markers and segments
  const polyline = useMemo<[number, number][]>(
    () => kmMarkers.map(m => [m.lat, m.lng] as [number, number]),
    [kmMarkers]
  );
  const segmentMarkers = useMemo(() => {
    if (!kmMarkers.length) return [];
    const byKm = new Map(kmMarkers.map(m => [Math.round(m.km), m] as const));
    return segments
      .map(s => {
        const m = byKm.get(Math.round(s.kmStart));
        if (!m) return null;
        return {
          lat: m.lat,
          lng: m.lng,
          status: s.status as "critico" | "atencao" | "conforme",
          label: `${s.km} · ${s.tipo}`,
          onClick: () => navigate(`/segmento/${s.id}`),
        };
      })
      .filter(Boolean) as { lat: number; lng: number; status: any; label: string; onClick: () => void }[];
  }, [segments, kmMarkers, navigate]);

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
      <div className="px-10 pb-12 space-y-6">
        {activeCount > 0 && (
          <div className="text-[12px] text-muted-foreground bg-surface-low rounded-lg px-3 py-2 inline-block">
            Mostrando {segments.length} de {segmentsRaw.length} segmentos com filtros ativos.
          </div>
        )}
        <div className="grid grid-cols-4 gap-5">
          <MetricCard label="Cobertura Total" value="29,3" unit="km" footer={<div className="h-1.5 rounded-full bg-surface-high"><div className="h-full w-full rounded-full bg-primary" /></div>} />
          <MetricCard label="Trechos Críticos" value={String(criticos)} unit={`de ${total} segmentos`} variant="danger" footer={
            <div className="h-1.5 rounded-full bg-surface-high">
              <div className="h-full rounded-full bg-destructive" style={{ width: `${total ? (criticos/total)*100 : 0}%` }} />
            </div>
          } />
          <MetricCard label="NDVI Médio" value={ndviAvg.toFixed(2).replace(".", ",")} unit="global" footer={
            <div className="flex h-1.5 gap-0.5 rounded-full overflow-hidden">
              <div className="flex-1 bg-destructive/30" /><div className="flex-1 bg-tertiary/40" /><div className="flex-[2] bg-primary" />
            </div>
          } />
          <MetricCard label="IRC Médio" value={String(ircAvg)} unit="/ 100" variant={ircAvg >= 75 ? "danger" : undefined} footer={
            <div className="h-1.5 rounded-full bg-surface-high">
              <div
                className="h-full rounded-full"
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

        <div className="grid grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <section className="bg-surface-lowest rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold tracking-wide uppercase">Rodoanel SP-021 — Mapa NDVI em Tempo Real</h3>
                <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Saudável</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-tertiary" /> Atenção</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Crítico</span>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden">
                <Suspense fallback={<Skeleton className="w-full h-[420px]" />}>
                  <OSMMap
                    className="w-full h-[420px]"
                    polyline={polyline}
                    markers={segmentMarkers}
                    fitBounds
                  />
                </Suspense>
              </div>
            </section>

            <section className="bg-surface-lowest rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold tracking-wide uppercase">Tendência NDVI (últimas 6 leituras)</h3>
                <span className="text-[12px] text-muted-foreground bg-surface-high px-3 py-1.5 rounded-full">Período: Junho – Agosto 2024</span>
              </div>
              <Suspense fallback={<Skeleton className="h-72 w-full" />}>
                <NDVIBarChart />
              </Suspense>
            </section>

            <WeatherForecast />

            <IRCPanel />

            <AIInsightsPanel />
          </div>

          <aside className="bg-surface-lowest rounded-xl p-5 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold tracking-wider uppercase">Alertas Ativos</h3>
              <span className="text-[11px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">{totalAlerts} total</span>
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
                <div className="text-[12px] text-destructive bg-destructive/10 rounded-lg p-3">
                  Não foi possível carregar os alertas. Tente novamente.
                </div>
              )}
              {!isLoading && !segmentsError && alerts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-[12px]">Nenhum alerta ativo. Tudo conforme.</p>
                </div>
              )}
              {alerts.map(a => <AlertCard key={a.id} alert={a} />)}
            </div>
            <button
              onClick={() => navigate("/relatorio")}
              className="w-full mt-4 py-3 rounded-lg border border-border text-[12px] font-semibold tracking-wider uppercase text-foreground hover:bg-surface-low"
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
