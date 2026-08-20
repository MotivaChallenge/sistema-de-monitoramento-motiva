import { TopHeader } from "@/components/vegia/TopHeader";
import { useSegments, useKmMarkers, useTotalCoverage, useHighways } from "@/hooks/useVegiaData";
import { useRoadRoute } from "@/hooks/useRoadRoute";
import { useFilters } from "@/contexts/FiltersContext";
import { GlobalFilters } from "@/components/vegia/GlobalFilters";
import { MapPointSheet } from "@/components/vegia/MapPointSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Activity, Inbox, Eye, Layers, Crosshair, Route, Network, Download, Building2, Leaf, ShieldCheck, ChevronDown, ChevronUp, Search, ListFilter, X } from "lucide-react";
import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { coordsForKm, kmForCoords, formatKmPrecise, formatKmRange } from "@/lib/km";

type StatusKey = "critico" | "atencao" | "conforme";
const PRIORIDADE: Record<StatusKey, string> = { critico: "Alta", atencao: "Média", conforme: "Baixa" };
const PAGE_SIZE = 40;

const OSMMap = lazy(() => import("@/components/vegia/OSMMap").then(m => ({ default: m.OSMMap })));

const Mapa = () => {
  const { data: highways = [] } = useHighways();
  const { matches, activeCount, rodovia, setRodovia } = useFilters();
  const selectedHighway = rodovia ?? "SP-021";
  const setSelectedHighway = (code: string) => setRodovia(code);
  const { data: segmentsRaw = [] } = useSegments();
  const { data: kmMarkers = [] } = useKmMarkers(selectedHighway);
  const { data: routed, isLoading: routeLoading, isFetching: routeFetching } = useRoadRoute(
    selectedHighway,
    useMemo(() => kmMarkers.map(m => ({ lat: m.lat, lng: m.lng })), [kmMarkers])
  );
  const routedLine = routed?.line;
  const routeSource = routed?.source;
  const { data: coverage = 0 } = useTotalCoverage();
  const [mapPoint, setMapPoint] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [baseLayer, setBaseLayer] = useState<"street" | "satellite" | "hybrid">("hybrid");
  const [showPolyline, setShowPolyline] = useState(true);
  const [kpisOpen, setKpisOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState<"todos" | StatusKey>("todos");
  const [page, setPage] = useState(1);
  const [focus, setFocus] = useState<{ lat: number; lng: number; key: string } | null>(null);

  const currentHighway = highways.find(h => h.code === selectedHighway);
  const currentConcession = currentHighway?.concessao;

  const concessionHighways = useMemo(
    () => highways.filter(h => h.concessao === currentConcession),
    [highways, currentConcession]
  );
  const concessionCodes = useMemo(
    () => new Set(concessionHighways.map(h => h.code)),
    [concessionHighways]
  );

  const concessionSegments = useMemo(
    () => segmentsRaw.filter(s => s.rodovia && concessionCodes.has(s.rodovia)),
    [segmentsRaw, concessionCodes]
  );

  const concessionKpis = useMemo(() => {
    const total = concessionSegments.length;
    const criticos = concessionSegments.filter(s => s.status === "critico").length;
    const atencao = concessionSegments.filter(s => s.status === "atencao").length;
    const conformes = concessionSegments.filter(s => s.status === "conforme").length;
    const conformidadePct = total ? Math.round((conformes / total) * 100) : 0;
    const ndviAvg = total
      ? concessionSegments.reduce((a, s) => a + s.ndvi, 0) / total
      : 0;
    const coberturaKm = concessionHighways.reduce(
      (a, h) => a + Math.max(0, h.km_fim - h.km_inicio),
      0
    );
    return {
      total,
      criticos,
      atencao,
      conformes,
      conformidadePct,
      ndviAvg,
      coberturaKm,
      rodoviasCount: concessionHighways.length,
    };
  }, [concessionSegments, concessionHighways]);

  const exportGeoJSON = () => {
    if (!currentHighway) return;
    const features: any[] = [];
    if (kmMarkers.length > 1) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: kmMarkers.map(m => [m.lng, m.lat]),
        },
        properties: {
          kind: "traçado",
          rodovia: currentHighway.code,
          nome: currentHighway.nome,
          concessao: currentHighway.concessao,
          km_inicio: currentHighway.km_inicio,
          km_fim: currentHighway.km_fim,
        },
      });
    }
    kmMarkers.forEach(m => {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [m.lng, m.lat] },
        properties: { kind: "waypoint", rodovia: currentHighway.code, km: m.km },
      });
    });
    segmentsRaw
      .filter(s => (s.rodovia ?? "SP-021") === selectedHighway)
      .forEach(s => {
        const marker = coordsForKm(kmMarkers, s.kmStart);
        if (!marker) return;
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [marker.lng, marker.lat] },
          properties: {
            kind: "segmento",
            id: s.id,
            km: s.km,
            km_preciso: formatKmPrecise(s.kmStart),
            km_start: s.kmStart,
            km_end: s.kmEnd,
            tipo: s.tipo,
            status: s.status,
            ndvi: s.ndvi,
            altura_cm: s.altura,
            limite_cm: s.limite,
            clausula: s.clausula,
            ultima_rocada: s.ultimaRocada,
          },
        });
      });
    const geojson = {
      type: "FeatureCollection",
      name: `${currentHighway.code} - ${currentHighway.nome}`,
      features,
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentHighway.code}.geojson`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("GeoJSON exportado", {
      description: `${currentHighway.code} · ${features.length} feições (traçado, marcos e segmentos).`,
    });
  };

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
        .filter(s => matches({ status: s.status, kmStart: s.kmStart, kmEnd: s.kmEnd, rodovia: s.rodovia ?? null, text: `${s.km} ${s.tipo} ${s.id}` })),
    [segmentsRaw, matches, selectedHighway]
  );

  const total = segments.length;
  const criticos = segments.filter(s => s.status === "critico").length;
  const atencao = segments.filter(s => s.status === "atencao").length;
  const conformes = segments.filter(s => s.status === "conforme").length;
  const conformidadePct = total ? Math.round((conformes / total) * 100) : 0;

  const polyline = useMemo<[number, number][]>(
    () =>
      showPolyline
        ? (routedLine && routedLine.length > 1
            ? routedLine
            : kmMarkers.map(m => [m.lat, m.lng] as [number, number]))
        : [],
    [kmMarkers, routedLine, showPolyline]
  );

  const segmentMarkers = useMemo(() => {
    if (!kmMarkers.length) return [];
    // For each segment, find the closest km_marker (by km value) and
    // interpolate a lat/lng between it and its neighbor so every segment
    // renders on the road even when km values don't align exactly.
    const sorted = [...kmMarkers].sort((a, b) => a.km - b.km);
    const locate = (km: number) => {
      if (!sorted.length) return null;
      if (km <= sorted[0].km) return { lat: sorted[0].lat, lng: sorted[0].lng };
      if (km >= sorted[sorted.length - 1].km)
        return { lat: sorted[sorted.length - 1].lat, lng: sorted[sorted.length - 1].lng };
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        if (km >= a.km && km <= b.km) {
          const t = b.km === a.km ? 0 : (km - a.km) / (b.km - a.km);
          return {
            lat: a.lat + (b.lat - a.lat) * t,
            lng: a.lng + (b.lng - a.lng) * t,
          };
        }
      }
      return null;
    };
    return segments
      .map(s => {
        const p = locate(s.kmStart);
        if (!p) return null;
        return {
          id: s.id,
          lat: p.lat,
          lng: p.lng,
          status: s.status as "critico" | "atencao" | "conforme",
          tipo: s.tipo,
          kmLabel: formatKmRange(s.kmStart, s.kmEnd),
          label: `${formatKmRange(s.kmStart, s.kmEnd)} · ${s.tipo}`,
        };
      })
      .filter(Boolean) as {
        id: string; lat: number; lng: number; status: StatusKey; tipo: string; kmLabel: string; label: string;
      }[];
  }, [segments, kmMarkers]);

  const listItems = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return segmentMarkers.filter(m => {
      if (listStatus !== "todos" && m.status !== listStatus) return false;
      if (!q) return true;
      return `${m.kmLabel} ${m.tipo} ${m.id}`.toLowerCase().includes(q);
    });
  }, [segmentMarkers, listSearch, listStatus]);

  const pageCount = Math.max(1, Math.ceil(listItems.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => listItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [listItems, page]
  );
  useEffect(() => { setPage(1); }, [listSearch, listStatus, selectedHighway]);
  useEffect(() => { if (page > pageCount) setPage(1); }, [page, pageCount]);

  const selectItem = (m: { id: string; lat: number; lng: number; label: string }) => {
    setFocus({ lat: m.lat, lng: m.lng, key: `${m.id}-${Date.now()}` });
    setMapPoint({ lat: m.lat, lng: m.lng, label: m.label });
  };

  /** Localização precisa (km + metros) do ponto clicado no eixo da rodovia. */
  const pointKm = useMemo(
    () => (mapPoint ? kmForCoords(kmMarkers, { lat: mapPoint.lat, lng: mapPoint.lng }) : null),
    [mapPoint, kmMarkers]
  );

  const listPanel = (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 border-b border-border/40 space-y-2">
        <label className="relative block">
          <span className="sr-only">Buscar segmento por KM, tipo ou identificador</span>
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={listSearch}
            onChange={e => setListSearch(e.target.value)}
            placeholder="Buscar por KM, tipo ou ID"
            className="w-full h-9 pl-8 pr-8 rounded-lg bg-surface-low border border-border/50 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          {listSearch && (
            <button
              onClick={() => setListSearch("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        <div className="flex items-center gap-1" role="group" aria-label="Filtrar por status">
          {([
            { v: "todos", label: "Todos" },
            { v: "critico", label: "Críticos" },
            { v: "atencao", label: "Atenção" },
            { v: "conforme", label: "Conformes" },
          ] as const).map(f => (
            <button
              key={f.v}
              onClick={() => setListStatus(f.v as any)}
              aria-pressed={listStatus === f.v}
              className={`flex-1 h-7 rounded-md text-[11px] font-semibold transition-smooth ${
                listStatus === f.v
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {pageItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Inbox className="h-4 w-4" />
            </div>
            <p className="text-[12px] font-semibold text-foreground">Nenhum segmento</p>
            <p className="text-[11px] mt-1">Ajuste a busca ou os filtros para exibir dados.</p>
          </div>
        )}
        {pageItems.map(m => (
          <button
            key={m.id}
            onClick={() => selectItem(m)}
            className="w-full text-left px-3 py-2.5 rounded-lg border border-border/40 bg-surface-low hover:bg-surface-high transition-smooth focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold tabular-nums">{m.kmLabel}</span>
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  m.status === "critico" ? "bg-destructive" : m.status === "atencao" ? "bg-tertiary" : "bg-primary"
                }`}
              />
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10.5px]">
              <span
                className={`px-1.5 py-0.5 rounded font-semibold ${
                  m.status === "critico"
                    ? "bg-destructive/10 text-destructive"
                    : m.status === "atencao"
                    ? "bg-tertiary/15 text-tertiary"
                    : "bg-primary/10 text-primary"
                }`}
              >
                Prioridade {PRIORIDADE[m.status]}
              </span>
              <span className="text-muted-foreground truncate">{m.tipo}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="tabular-nums">{listItems.length} segmento{listItems.length === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2 h-6 rounded border border-border/50 disabled:opacity-40 hover:bg-surface-high"
          >
            Anterior
          </button>
          <span className="tabular-nums px-1">{page}/{pageCount}</span>
          <button
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
            className="px-2 h-6 rounded border border-border/50 disabled:opacity-40 hover:bg-surface-high"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <TopHeader
        current="Mapa Operacional"
        showStatusBadges
        rightSlot={<GlobalFilters />}
      />
      <div className="relative h-[calc(100vh-72px)] w-full overflow-hidden">
        <h1 className="sr-only">Mapa operacional da malha rodoviária</h1>
        {/* Full-screen map */}
        <div className="absolute inset-0">
          <Suspense fallback={<Skeleton className="w-full h-full" />}>
            <OSMMap
              className="w-full h-full"
              polyline={polyline}
              markers={segmentMarkers}
              fitBounds
              focus={focus}
              onPointSelect={(lat, lng, label) => setMapPoint({ lat, lng, label })}
              baseLayer={baseLayer}
            />
          </Suspense>
        </div>

        {/* Floating overlay: KPIs + Camadas + Legenda (left column, scrollable) */}
        <div className="absolute top-4 left-4 bottom-6 z-[400] hidden md:flex flex-col gap-3 overflow-y-auto pr-1 pb-1 [scrollbar-width:thin]">
          {/* Concession + highway selector */}
          <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-card w-[280px] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Concessão · Rodovia</span>
              <Network className="h-3.5 w-3.5 text-primary" />
            </div>
            <select
              value={selectedHighway}
              onChange={(e) => setSelectedHighway(e.target.value)}
              className="w-full bg-surface-low border border-border/50 rounded-lg px-3 py-2 text-[12px] font-medium focus:outline-none focus:border-primary/50"
            >
              {highwaysByConcession.map(([concessao, list]) => (
                <optgroup key={concessao} label={concessao}>
                  {list.map(h => (
                    <option key={h.code} value={h.code}>
                      {h.code} · {h.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {currentHighway && (
              <div className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">{currentHighway.concessao}</span> ·
                {" "}km {currentHighway.km_inicio.toFixed(1).replace(".", ",")} → {currentHighway.km_fim.toFixed(1).replace(".", ",")}
                {" "}· {currentHighway.uf_inicio}
                {currentHighway.uf_fim !== currentHighway.uf_inicio ? `→${currentHighway.uf_fim}` : ""}
                {currentHighway.code !== "SP-021" && (
                  <div className="mt-1 text-[10px] text-tertiary">
                    Traçado aproximado — georreferência oficial pendente.
                  </div>
                )}
              </div>
            )}
            <button
              onClick={exportGeoJSON}
              disabled={!currentHighway || kmMarkers.length === 0}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar GeoJSON
            </button>
            <button
              onClick={() => setKpisOpen(o => !o)}
              aria-expanded={kpisOpen}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-smooth"
            >
              {kpisOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {kpisOpen ? "Ocultar indicadores" : "Mostrar indicadores"}
            </button>
          </div>

          {/* KPIs agregados da concessão selecionada */}
          {kpisOpen && currentConcession && (
            <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-card w-[280px] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  KPIs da concessão
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {concessionKpis.rodoviasCount} rodovia{concessionKpis.rodoviasCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-[11px] text-foreground font-semibold mb-3 truncate" title={currentConcession}>
                {currentConcession}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    <Route className="h-3 w-3" /> Cobertura
                  </div>
                  <div className="text-[18px] font-bold tabular-nums">
                    {concessionKpis.coberturaKm.toFixed(1).replace(".", ",")}
                  </div>
                  <div className="text-[10px] text-muted-foreground">km monitorados</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    <AlertTriangle className="h-3 w-3" /> Críticos
                  </div>
                  <div className="text-[18px] font-bold tabular-nums text-destructive">
                    {concessionKpis.criticos}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    de {concessionKpis.total} trechos
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    <Leaf className="h-3 w-3" /> NDVI médio
                  </div>
                  <div className="text-[18px] font-bold tabular-nums">
                    {concessionKpis.ndviAvg.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {concessionKpis.ndviAvg >= 0.6
                      ? "biomassa alta"
                      : concessionKpis.ndviAvg >= 0.4
                      ? "moderada"
                      : "controlada"}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    <ShieldCheck className="h-3 w-3" /> Conformidade
                  </div>
                  <div
                    className={`text-[18px] font-bold tabular-nums ${
                      concessionKpis.conformidadePct >= 80
                        ? "text-primary"
                        : concessionKpis.conformidadePct >= 60
                        ? "text-tertiary"
                        : "text-destructive"
                    }`}
                  >
                    {concessionKpis.conformidadePct}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {concessionKpis.atencao} em atenção
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/40">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-high">
                  {concessionKpis.total > 0 && (
                    <>
                      <div
                        className="bg-primary transition-all"
                        style={{ width: `${(concessionKpis.conformes / concessionKpis.total) * 100}%` }}
                        title={`${concessionKpis.conformes} conformes`}
                      />
                      <div
                        className="bg-tertiary transition-all"
                        style={{ width: `${(concessionKpis.atencao / concessionKpis.total) * 100}%` }}
                        title={`${concessionKpis.atencao} atenção`}
                      />
                      <div
                        className="bg-destructive transition-all"
                        style={{ width: `${(concessionKpis.criticos / concessionKpis.total) * 100}%` }}
                        title={`${concessionKpis.criticos} críticos`}
                      />
                    </>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
                  <span>Distribuição de status</span>
                  <span className="tabular-nums text-foreground font-semibold">
                    {concessionKpis.total} segmentos
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className={`bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-card w-[240px] shrink-0 ${kpisOpen ? "" : "hidden"}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Resumo da malha</span>
              <Route className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[20px] font-bold tabular-nums">
                  {currentHighway
                    ? (currentHighway.km_fim - currentHighway.km_inicio).toFixed(1).replace(".", ",")
                    : coverage.toFixed(1).replace(".", ",")}
                </div>
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

          <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-card w-[240px] shrink-0">
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
                  aria-pressed={baseLayer === l.key}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-medium transition-smooth ${
                    baseLayer === l.key
                      ? "bg-primary/15 text-primary border border-primary/40 ring-1 ring-primary/30 font-semibold"
                      : "bg-surface-low text-foreground hover:bg-surface-high border border-transparent"
                  }`}
                >
                  <span>{l.label}</span>
                  {baseLayer === l.key && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider">
                      <Eye className="h-3 w-3" /> Ativo
                    </span>
                  )}
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
                {showPolyline && kmMarkers.length >= 2 && (
                  <div className="px-1 pt-1 text-[10px] leading-relaxed">
                    {routeLoading || routeFetching ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Ajustando traçado à malha viária…
                      </span>
                    ) : routeSource === "osrm" ? (
                      <span className="inline-flex items-center gap-1.5 text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Traçado alinhado à pista (OSRM).
                      </span>
                    ) : routeSource === "fallback" ? (
                      <span className="inline-flex items-center gap-1.5 text-tertiary">
                        <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                        Roteamento indisponível — exibindo waypoints interpolados.
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-card w-[240px] shrink-0">
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

        {/* Floating overlay: Segment list (right side, desktop) */}
        <div
          className={`absolute top-4 right-4 bottom-6 z-[400] w-[280px] flex-col transition-opacity duration-200 ${
            mapPoint ? "hidden" : "hidden md:flex"
          }`}
          aria-hidden={!!mapPoint}
        >
          <div className={`bg-background/90 backdrop-blur-md border border-border/50 rounded-xl shadow-card flex flex-col overflow-hidden ${listOpen ? "h-full" : ""}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-2">
                <ListFilter className="h-3.5 w-3.5 text-primary" />
                Segmentos no mapa
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold tabular-nums">
                  {listItems.length}
                </span>
                <button
                  onClick={() => setListOpen(o => !o)}
                  aria-expanded={listOpen}
                  aria-label={listOpen ? "Recolher lista de segmentos" : "Expandir lista de segmentos"}
                  className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high"
                >
                  {listOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            {listOpen && listPanel}
          </div>
        </div>

        {/* Mobile: bottom sheet with the same list */}
        <div className={`${mapPoint ? "hidden" : "md:hidden"} absolute bottom-4 inset-x-4 z-[400] flex items-center gap-2`}>
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex-1 h-11 rounded-xl bg-background/95 backdrop-blur-md border border-border/60 shadow-card text-[13px] font-semibold inline-flex items-center justify-center gap-2">
                <ListFilter className="h-4 w-4 text-primary" />
                Segmentos ({listItems.length})
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] p-0 flex flex-col">
              <div className="px-4 py-3 border-b border-border/40">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider">Segmentos no mapa</h2>
              </div>
              <div className="flex-1 min-h-0">{listPanel}</div>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <button aria-label="Camadas e indicadores" className="h-11 w-11 rounded-xl bg-background/95 backdrop-blur-md border border-border/60 shadow-card inline-flex items-center justify-center">
                <Layers className="h-4 w-4 text-primary" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[55vh] overflow-y-auto">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-3">Camadas</h2>
              <div className="space-y-2">
                {([
                  { key: "street", label: "Mapa" },
                  { key: "satellite", label: "Satélite" },
                  { key: "hybrid", label: "Híbrido" },
                ] as const).map(l => (
                  <button
                    key={l.key}
                    onClick={() => setBaseLayer(l.key)}
                    aria-pressed={baseLayer === l.key}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium ${
                      baseLayer === l.key
                        ? "bg-primary/15 text-primary border border-primary/40 font-semibold"
                        : "bg-surface-low border border-transparent"
                    }`}
                  >
                    {l.label}
                    {baseLayer === l.key && <span className="text-[10px] uppercase tracking-wider">Ativo</span>}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-[12px]">
                <div><span className="text-muted-foreground">Segmentos</span><div className="text-[18px] font-bold tabular-nums">{total}</div></div>
                <div><span className="text-muted-foreground">Críticos</span><div className="text-[18px] font-bold tabular-nums text-destructive">{criticos}</div></div>
                <div><span className="text-muted-foreground">Atenção</span><div className="text-[18px] font-bold tabular-nums text-tertiary">{atencao}</div></div>
                <div><span className="text-muted-foreground">Conformidade</span><div className="text-[18px] font-bold tabular-nums">{conformidadePct}%</div></div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <MapPointSheet
        open={!!mapPoint}
        point={mapPoint}
        kmInfo={
          pointKm
            ? { rodovia: selectedHighway, km: pointKm.km, offsetMeters: pointKm.offsetMeters }
            : null
        }
        onClose={() => setMapPoint(null)}
      />
    </>
  );
};

export default Mapa;
