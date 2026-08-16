import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, RefreshCw } from "lucide-react";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Status = "critico" | "atencao" | "conforme";

export interface OSMMarker {
  lat: number;
  lng: number;
  label?: string;
  status?: Status;
  onClick?: () => void;
}

type Props = {
  lat?: number;
  lng?: number;
  label?: string;
  status?: Status;
  className?: string;
  /** When provided, draws the route as a polyline. */
  polyline?: [number, number][];
  /** When provided, plots multiple status-colored markers. Center+single marker are skipped. */
  markers?: OSMMarker[];
  /** Override map zoom level. */
  zoom?: number;
  /** Auto-fit bounds to polyline/markers. */
  fitBounds?: boolean;
  /** Called when user clicks anywhere on the map or on a marker. */
  onPointSelect?: (lat: number, lng: number, label?: string) => void;
  /** Initial base layer. Defaults to "satellite" (Google Hybrid). */
  baseLayer?: "street" | "satellite" | "hybrid";
  /** When changed, the map flies to this coordinate. */
  focus?: { lat: number; lng: number; zoom?: number; key?: string | number } | null;
};

const statusColor = (s?: string) =>
  s === "critico" ? "hsl(0 72% 45%)" : s === "atencao" ? "hsl(35 85% 50%)" : "hsl(142 55% 40%)";

export const OSMMap = ({
  lat, lng, label, status, className,
  polyline, markers, zoom, fitBounds, onPointSelect, baseLayer = "satellite", focus,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const baseRef = useRef<L.TileLayer | null>(null);
  const [tilesLoading, setTilesLoading] = useState(true);
  const [tileError, setTileError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const onPointSelectRef = useRef(onPointSelect);
  onPointSelectRef.current = onPointSelect;

  // ---- Effect 1: initialize the map ONCE (only re-init if base layer changes)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if ((containerRef.current as any)._leaflet_id) {
      (containerRef.current as any)._leaflet_id = null;
    }
    const centerLat = lat ?? markers?.[0]?.lat ?? polyline?.[0]?.[0] ?? -23.5505;
    const centerLng = lng ?? markers?.[0]?.lng ?? polyline?.[0]?.[1] ?? -46.6333;
    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: zoom ?? 15,
      scrollWheelZoom: false,
      attributionControl: false,
    });
    mapRef.current = map;

    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    });
    const satellite = L.tileLayer("https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      subdomains: ["0", "1", "2", "3"],
      attribution: "&copy; Google",
      maxZoom: 21,
    });
    const hybrid = L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ["0", "1", "2", "3"],
      attribution: "&copy; Google",
      maxZoom: 21,
    });

    const initial = baseLayer === "street" ? street : baseLayer === "satellite" ? satellite : hybrid;
    initial.addTo(map);
    baseRef.current = initial;

    let errors = 0;
    setTilesLoading(true);
    setTileError(false);
    const attach = (layer: L.TileLayer) => {
      layer.on("loading", () => { errors = 0; setTilesLoading(true); });
      layer.on("load", () => { setTilesLoading(false); if (errors === 0) setTileError(false); });
      layer.on("tileerror", () => {
        errors += 1;
        if (errors >= 3) { setTileError(true); setTilesLoading(false); }
      });
    };
    [street, satellite, hybrid].forEach(attach);
    map.on("baselayerchange", (e: any) => { baseRef.current = e.layer; });

    // Garante o redesenho correto quando o contêiner muda de tamanho.
    const ro = new ResizeObserver(() => { try { map.invalidateSize(); } catch { /* ignore */ } });
    ro.observe(containerRef.current);
    setTimeout(() => { try { map.invalidateSize(); } catch { /* ignore */ } }, 250);

    L.control.layers(
      { "Mapa": street, "Satélite": satellite, "Híbrido": hybrid },
      undefined,
      { position: "topright", collapsed: true },
    ).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onPointSelectRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      try { ro.disconnect(); } catch { /* ignore */ }
      try { map.off(); map.remove(); } catch { /* ignore */ }
      mapRef.current = null;
      layerGroupRef.current = null;
      baseRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseLayer, retryKey]);

  // ---- Effect: fly to a focused coordinate
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    try { map.flyTo([focus.lat, focus.lng], focus.zoom ?? Math.max(map.getZoom(), 15), { duration: 0.8 }); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key, focus?.lat, focus?.lng]);

  // ---- Effect 2: redraw markers/polyline/single-point when data changes
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;
    group.clearLayers();

    if (polyline && polyline.length > 1) {
      L.polyline(polyline, { color: "hsl(220 90% 55%)", weight: 4, opacity: 0.85 }).addTo(group);
    }

    if (markers && markers.length > 0) {
      markers.forEach((m) => {
        const dot = L.circleMarker([m.lat, m.lng], {
          radius: 7,
          color: statusColor(m.status),
          fillColor: statusColor(m.status),
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(group);
        if (m.label) dot.bindPopup(`<strong>${m.label}</strong>`);
        dot.on("click", (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          if (onPointSelectRef.current) onPointSelectRef.current(m.lat, m.lng, m.label);
          else m.onClick?.();
        });
      });
    } else if (lat != null && lng != null) {
      L.circle([lat, lng], {
        radius: 120,
        color: statusColor(status),
        fillColor: statusColor(status),
        fillOpacity: 0.25,
      }).addTo(group);
      L.marker([lat, lng], { icon })
        .addTo(group)
        .bindPopup(`<strong>${label ?? "Localização"}</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }

    if (fitBounds) {
      const pts: [number, number][] = [
        ...(polyline ?? []),
        ...((markers ?? []).map(m => [m.lat, m.lng] as [number, number])),
      ];
      if (pts.length > 1) {
        try { map.fitBounds(L.latLngBounds(pts), { padding: [20, 20] }); } catch { /* ignore */ }
      }
    }
  }, [lat, lng, label, status, polyline, markers, fitBounds]);

  const retry = () => {
    setTileError(false);
    setTilesLoading(true);
    if (baseRef.current) {
      try { baseRef.current.redraw(); } catch { /* ignore */ }
    }
    setRetryKey(k => k + 1);
  };

  return (
    <div className={className} style={{ position: "relative", zIndex: 0 }}>
      <div ref={containerRef} className="absolute inset-0" />
      {tilesLoading && !tileError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-none rounded-full bg-background/90 border border-border/50 px-3 py-1 text-[11px] text-muted-foreground shadow-card inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Carregando imagens do mapa…
        </div>
      )}
      {tileError && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center max-w-[280px] px-4">
            <AlertTriangle className="h-6 w-6 mx-auto text-tertiary mb-2" />
            <p className="text-[13px] font-semibold">Não foi possível carregar o mapa</p>
            <p className="text-[11.5px] text-muted-foreground mt-1">
              As imagens de satélite não responderam. Verifique a conexão e tente novamente.
            </p>
            <button
              onClick={retry}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-smooth"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
