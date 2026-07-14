import { TopHeader } from "@/components/vegia/TopHeader";
import { useSegments, useKmMarkers, useTotalCoverage, useHighways } from "@/hooks/useVegiaData";
import { useFilters } from "@/contexts/FiltersContext";
import { GlobalFilters } from "@/components/vegia/GlobalFilters";
import { MapPointSheet } from "@/components/vegia/MapPointSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Activity, Inbox, Eye, Layers, Crosshair, Route, Network } from "lucide-react";
import { useState, useMemo, lazy, Suspense } from "react";

const OSMMap = lazy(() => import("@/components/vegia/OSMMap").then(m => ({ default: m.OSMMap })));

const Mapa = () => {
  const { data: highways = [] } = useHighways();
  const [selectedHighway, setSelectedHighway] = useState<string>("SP-021");
  const { data: segmentsRaw = [] } = useSegments();
  const { data: kmMarkers = [] } = useKmMarkers(selectedHighway);
  const { data: coverage = 0 } = useTotalCoverage();
  const { matches, activeCount } = useFilters();
  const [mapPoint, setMapPoint] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [baseLayer, setBaseLayer] = useState<"street" | "satellite" | "hybrid">("hybrid");
  const [showPolyline, setShowPolyline] = useState(true);

  const currentHighway = highways.find(h => h.code === selectedHighway);
  const highwaysByConcession = useMemo(() => {
    const map = new Map<string, typeof highways>();
    highways.forEach(h => {
      if (!map.has(h.concessao)) map.set(h.concessao, [] as any);
      map.get(h.concessao)!.push(h);
    });
    return Array.from(map.entries());
  }, [highways]);

  const segments = useMemo(
    () =>
      segmentsRaw
        .filter(s => (s.rodovia ?? "SP-021") === selectedHighway)
        .filter(s => matches({ status: s.status, kmStart: s.kmStart })),
    [segmentsRaw, matches, selectedHighway]
  );

  const total = segments.length;
  const criticos = segments.filter(s => s.status === "critico").length;
  const atencao = segments.filter(s => s.status === "atencao").length;
  const conformes = segments.filter(s => s.status === "conforme").length;
  const conformidadePct = total ? Math.round((conformes / total) * 100) : 0;

  const polyline = useMemo<[number, number][]>(
    () => (showPolyline ? kmMarkers.map(m => [m.lat, m.lng] as [number, number]) : []),
    [kmMarkers, showPolyline]
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
        };
      })
      .filter(Boolean) as { lat: number; lng: number; status: any; label: string }[];
  }, [segments, kmMarkers]);

  return (
    <>
      <TopHeader
        current="Mapa Operacional"
        showStatusBadges
        rightSlot={<GlobalFilters />}
      />
      <div className="relative h-[calc(100vh-72px)] w-full overflow-hidden">
        {/* Full-screen map */}
        <div className="absolute inset-0">
          <Suspense fallback={<Skeleton className="w-full h-full" />}>
            <OSMMap
              className="w-full h-full"
              polyline={polyline}
              markers={segmentMarkers}
              fitBounds
              onPointSelect={(lat, lng, label) => setMapPoint({ lat, lng, label })}
              baseLayer={baseLayer}
            />
          </Suspense>
        </div>

        {/* Floating overlay: KPIs (top-left) */}
        <div className="absolute top-4 left-4 z-[400] flex flex-col gap-3">
          <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-card w-[240px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Resumo da malha</span>
              <Route className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[20px] font-bold tabular-nums">{coverage.toFixed(1).replace(".", ",")}</div>
                <div className="text-[10px] text-muted-foreground">km monitorados</div>
              </div>
              <div>
                <div className="text-[20px] font-bold tabular-nums">{total}</div>
                <div className="text-[10px] text-muted-foreground">segmentos</div>
              </div>
              <div>
                <div className="text-[20px] font-bold tabular-nums text-destructive">{criticos}</div>
                <div className="text-[10px] text-muted-foreground">críticos</div>
              </div>
              <div>
                <div className="text-[20px] font-bold tabular-nums text-tertiary">{atencao}</div>
                <div className="text-[10px] text-muted-foreground">atenção</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Conformidade</span>
                <span className="font-semibold">{conformidadePct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-high mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${conformidadePct}%`,
                    background: conformidadePct >= 80
                      ? "hsl(var(--primary))"
                      : conformidadePct >= 60
                      ? "hsl(var(--tertiary))"
                      : "hsl(var(--destructive))",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Active filters indicator */}
          {activeCount > 0 && (
            <div className="bg-background/90 backdrop-blur-md border border-primary/30 rounded-lg px-3 py-2 text-[11px] text-muted-foreground inline-flex items-center gap-2 shadow-sm animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Mostrando {segments.length} de {segmentsRaw.length} segmentos filtrados.
            </div>
          )}
        </div>

        {/* Floating overlay: Legend & Layer controls (bottom-left) */}
        <div className="absolute bottom-6 left-4 z-[400] flex flex-col gap-3">
          <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-card w-[240px]">
            <div className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Layers className="h-3.5 w-3.5" /> Camadas
            </div>
            <div className="space-y-2">
              {([
                { key: "street", label: "Mapa" },
                { key: "satellite", label: "Satélite" },
                { key: "hybrid", label: "Híbrido" },
              ] as const).map((l) => (
                <button
                  key={l.key}
                  onClick={() => setBaseLayer(l.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-medium transition-smooth ${
                    baseLayer === l.key
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-surface-low text-foreground hover:bg-surface-high border border-transparent"
                  }`}
                >
                  <span>{l.label}</span>
                  {baseLayer === l.key && <Eye className="h-3 w-3" />}
                </button>
              ))}
              <div className="border-t border-border/40 pt-2 mt-2">
                <button
                  onClick={() => setShowPolyline(p => !p)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-smooth ${
                    showPolyline
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  Traçado da rodovia
                  <span className={`ml-auto h-2 w-2 rounded-full ${showPolyline ? "bg-primary" : "bg-muted"}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-card w-[240px]">
            <div className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Activity className="h-3.5 w-3.5" /> Legenda
            </div>
            <div className="space-y-2 text-[12px]">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Saudável</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-tertiary" /> Atenção</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Crítico</span>
            </div>
          </div>
        </div>

        {/* Floating overlay: Segment list (right side) */}
        <div className="absolute top-4 right-4 bottom-6 z-[400] w-[280px] flex flex-col">
          <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl shadow-card flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                Segmentos no mapa
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold tabular-nums">{segmentMarkers.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {segmentMarkers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-turquoise/10 text-turquoise flex items-center justify-center">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <p className="text-[12px] font-semibold text-foreground">Nenhum segmento</p>
                  <p className="text-[11px] mt-1">Ajuste os filtros para exibir dados.</p>
                </div>
              )}
              {segmentMarkers.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setMapPoint({ lat: m.lat, lng: m.lng, label: m.label })}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-border/40 bg-surface-low hover:bg-surface-high transition-smooth group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium">{m.label}</span>
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        m.status === "critico"
                          ? "bg-destructive"
                          : m.status === "atencao"
                          ? "bg-tertiary"
                          : "bg-primary"
                      }`}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <MapPointSheet
        open={!!mapPoint}
        point={mapPoint}
        onClose={() => setMapPoint(null)}
      />
    </>
  );
};

export default Mapa;
