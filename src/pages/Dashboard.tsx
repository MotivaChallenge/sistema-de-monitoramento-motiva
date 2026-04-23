import { TopHeader } from "@/components/vegia/TopHeader";
import { MetricCard } from "@/components/vegia/MetricCard";
import { NDVIBarChart } from "@/components/vegia/NDVIBarChart";
import { AlertCard } from "@/components/vegia/AlertCard";
import { useSegments, useKmMarkers } from "@/hooks/useVegiaData";
import { OSMMap } from "@/components/vegia/OSMMap";
import { WeatherForecast } from "@/components/vegia/WeatherForecast";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMemo } from "react";

const Dashboard = () => {
  const { data: segments = [], isLoading } = useSegments();
  const { data: kmMarkers = [] } = useKmMarkers();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const total = segments.length;
  const criticos = segments.filter(s => s.status === "critico").length;
  const conformes = segments.filter(s => s.status === "conforme").length;
  const alerts = segments.filter(s => s.status !== "conforme").slice(0, 3);
  const totalAlerts = segments.filter(s => s.status !== "conforme").length;
  const conformidadePct = total ? Math.round((conformes / total) * 100) : 0;
  const ndviAvg = total ? (segments.reduce((a, s) => a + s.ndvi, 0) / total) : 0;

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
          <button
            onClick={() => {
              qc.invalidateQueries();
              toast.success("Dados atualizados", { description: "Sincronizando leituras Sentinel-2…" });
            }}
            className="ml-2 inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[12px] font-semibold tracking-wider uppercase"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar Dados
          </button>
        }
      />
      <div className="px-10 pb-12 space-y-6">
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
          <MetricCard label="Conformidade ARTESP" value={String(conformidadePct)} unit="%" footer={
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container text-[11px] font-semibold tracking-wider text-secondary-on-container">
              {conformidadePct >= 80 ? "ALTA CONFORMIDADE" : conformidadePct >= 50 ? "MODERADA" : "BAIXA"}
            </span>
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
                <OSMMap
                  className="w-full h-[420px]"
                  polyline={polyline}
                  markers={segmentMarkers}
                  fitBounds
                />
              </div>
            </section>

            <section className="bg-surface-lowest rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold tracking-wide uppercase">Tendência NDVI (últimas 6 leituras)</h3>
                <span className="text-[12px] text-muted-foreground bg-surface-high px-3 py-1.5 rounded-full">Período: Junho – Agosto 2024</span>
              </div>
              <NDVIBarChart />
            </section>

            <WeatherForecast />
          </div>

          <aside className="bg-surface-lowest rounded-xl p-5 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold tracking-wider uppercase">Alertas Ativos</h3>
              <span className="text-[11px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">{totalAlerts} total</span>
            </div>
            <div className="space-y-3">
              {isLoading && <div className="text-[12px] text-muted-foreground">Carregando alertas…</div>}
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
