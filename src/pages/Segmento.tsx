import { useNavigate, useParams } from "react-router-dom";
import { lazy, Suspense, useMemo } from "react";
import { TopHeader } from "@/components/vegia/TopHeader";
import { segmentEvolution } from "@/data/mock";
import { useSegment, useKmMarkers, useRocadaClassification } from "@/hooks/useVegiaData";
import { MonoClause } from "@/components/vegia/MonoClause";
import { AIInsightBubble } from "@/components/vegia/AIInsightBubble";
import { ArrowUpRight, Download, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";
import { OperatorActions } from "@/components/vegia/OperatorActions";
import { RocadaTimeline } from "@/components/vegia/RocadaTimeline";
import { Skeleton } from "@/components/ui/skeleton";

const OSMMap = lazy(() => import("@/components/vegia/OSMMap").then(m => ({ default: m.OSMMap })));
const NDVILineChart = lazy(() => import("@/components/vegia/NDVILineChart").then(m => ({ default: m.NDVILineChart })));

const Segmento = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: seg, isLoading } = useSegment(id);
  const { data: kmMarkers = [] } = useKmMarkers();
  const { data: rocada = [] } = useRocadaClassification();

  // Resolve real lat/lng from km_markers (fallback to street.lat/lng or São Paulo)
  const marker = seg ? kmMarkers.find(m => Math.round(m.km) === Math.round(seg.kmStart)) : undefined;
  const lat = marker?.lat ?? Number(seg?.street?.lat) ?? -23.5505;
  const lng = marker?.lng ?? Number(seg?.street?.lng) ?? -46.6333;

  // Find recommended equipment by nearest rocada centroid (squared distance — fine for ranking)
  const recommended = useMemo(() => {
    if (!rocada.length) return null;
    let best = rocada[0]; let bestD = Infinity;
    for (const r of rocada) {
      const dx = r.lat - lat, dy = r.lng - lng;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = r; }
    }
    return best;
  }, [rocada, lat, lng]);

  if (isLoading) return (
    <div className="p-10 space-y-4">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-3 gap-4 pt-4">
        <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
      </div>
      <Skeleton className="h-[420px] w-full" />
    </div>
  );
  if (!seg) return (
    <div className="p-10 text-center text-muted-foreground text-sm">
      <p className="mb-3">Segmento não encontrado.</p>
      <button onClick={() => navigate("/dashboard")} className="px-4 py-2 rounded-lg border border-border hover:bg-surface-low text-foreground text-[12px] font-semibold uppercase tracking-wider">
        Voltar ao mapa
      </button>
    </div>
  );

  return (
    <>
      <TopHeader
        breadcrumb={[{ label: "RODOANEL SP-021", to: "/dashboard" }]}
        current={seg.km}
        showTabs
        rightSlot={
          <span className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container text-[12px] font-semibold tracking-wider uppercase text-secondary-on-container">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--on-secondary-container))]" /> Monitoramento Ativo
          </span>
        }
      />
      <div className="px-10 pb-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[34px] font-bold tracking-tight">Detalhamento de Segmento</h1>
            <p className="text-muted-foreground mt-1">Análise granulométrica de saúde vegetal via sensoriamento remoto.</p>
          </div>
          <div className="bg-destructive/10 rounded-xl px-6 py-4 text-right">
            <div className="label-md text-destructive/80">Estado Crítico</div>
            <div className="text-destructive text-[22px] font-bold flex items-center gap-2 justify-end mt-1">
              <AlertTriangle className="h-5 w-5" /> 48h para Resolução
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <section className="bg-surface-lowest rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[14px] font-semibold tracking-wider uppercase">Métricas de Fiscalização</h3>
                <span className="label-md">REF: UTM-23S_E521_N734</span>
              </div>
              <dl className="divide-y divide-border/40">
                <Row label="Índice NDVI (Vegetação)" value={<span className="text-primary">{seg.ndvi.toFixed(2)} <span className="text-muted-foreground text-[12px] font-normal">vigente</span></span>} />
                <Row label="Altura Estimada (Média)" value={
                  <span className={seg.altura > seg.limite ? "text-destructive flex items-center gap-1.5 justify-end" : ""}>
                    {seg.altura} cm {seg.altura > seg.limite && <ArrowUpRight className="h-4 w-4" />}
                  </span>
                } />
                <Row label="Limite Contratual" value={`${seg.limite} cm`} />
                <Row label="Última Roçada Executada" value={seg.ultimaRocada} />
                {recommended && (
                  <Row label="Equipamento Recomendado" value={
                    <span className="text-[13px] font-medium text-foreground">{recommended.classe}</span>
                  } />
                )}
                <Row label="Coordenadas" value={
                  <span className="font-mono text-[12px] text-muted-foreground">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                } />
                {seg.deadline && (
                  <div className="flex items-center justify-between py-3.5 -mx-2 px-2 rounded bg-destructive/10">
                    <span className="text-[13px] text-destructive">Deadline ARTESP (Notificação {seg.notificationId})</span>
                    <span className="text-destructive font-semibold underline underline-offset-4">{seg.deadline}</span>
                  </div>
                )}
              </dl>
              <div className="mt-5">
                <MonoClause>{seg.clauseFull}</MonoClause>
              </div>
            </section>

            <section className="bg-surface-lowest rounded-xl p-6">
              <h3 className="text-[14px] font-semibold tracking-wider uppercase mb-4">Evolução de Crescimento (30 dias)</h3>
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <NDVILineChart data={segmentEvolution} threshold={30} thresholdLabel="THRESHOLD (30cm)" />
              </Suspense>
            </section>

            {seg.insight && <AIInsightBubble>{seg.insight}</AIInsightBubble>}

            <RocadaTimeline segmentId={seg.id} />
          </div>

          <aside className="space-y-5">
            <div className="bg-surface-lowest rounded-xl overflow-hidden">
              <Suspense fallback={<Skeleton className="aspect-[4/3] w-full" />}>
                <OSMMap
                  lat={lat}
                  lng={lng}
                  label={`${seg.km} · ${seg.tipo}`}
                  status={seg.status as "critico" | "atencao" | "conforme"}
                  className="aspect-[4/3] w-full"
                />
              </Suspense>
              <div className="p-4">
                <div className="label-md mb-1">Localização (OpenStreetMap)</div>
                <p className="text-[13px] italic text-foreground/80">
                  {marker
                    ? `Marco quilométrico oficial KM ${marker.km} — Rodoanel Oeste SP-021.`
                    : (seg.street?.caption ?? "Coordenadas estimadas.")}
                </p>
              </div>
            </div>

            <div className="bg-surface-lowest rounded-xl overflow-hidden">
              <div className="px-4 pt-4 flex items-center justify-between">
                <h4 className="text-[13px] font-semibold tracking-wider uppercase">Detecção IA Object</h4>
                <span className="text-[11px] font-mono px-2 py-1 rounded bg-secondary-container text-secondary-on-container">YOLOv8x</span>
              </div>
              <div className="m-4 mt-3 relative aspect-[4/3] rounded overflow-hidden" style={{ background: "linear-gradient(180deg, #6E7F4F 0%, #3F4D2A 100%)" }}>
                <div className="absolute inset-x-[20%] inset-y-[15%]" style={{ background: "repeating-linear-gradient(180deg, transparent 0 4px, rgba(255,255,255,.18) 4px 5px)" }} />
                <span className="absolute top-2 left-2 px-2 py-1 text-[11px] font-mono font-semibold bg-destructive text-destructive-foreground rounded-sm">
                  {seg.detection?.label}: {seg.detection?.confidence}%
                </span>
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface-high">Classe: {seg.detection?.classe}</span>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface-high">Obstáculo: Sim</span>
              </div>
            </div>

            <OperatorActions segmentId={seg.id} />

            <div>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(seg, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `segmento-${seg.id}.json`;
                  document.body.appendChild(a); a.click(); a.remove();
                  URL.revokeObjectURL(url);
                  toast.success("Segmento exportado", { description: `segmento-${seg.id}.json` });
                }}
                className="w-full h-11 rounded-lg bg-surface-high hover:bg-surface-high/80 text-[13px] font-medium inline-flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" /> Exportar
              </button>
            </div>

            <div className="pt-3">
              <div className="label-md mb-2">Equipe Designada</div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold">Consórcio SP-Verde</div>
                  <div className="text-[12px] text-muted-foreground">Base KM 12 · 15min de distância</div>
                </div>
              </div>
            </div>

            <button onClick={() => navigate(`/analise-cv/${seg.id}`)} className="w-full text-[12px] text-primary font-semibold hover:underline pt-1">
              Ver análise visual completa →
            </button>
          </aside>
        </div>
      </div>
    </>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between py-3.5">
    <span className="text-[13px] text-muted-foreground">{label}</span>
    <span className="text-[15px] font-semibold tabular-nums">{value}</span>
  </div>
);

export default Segmento;
