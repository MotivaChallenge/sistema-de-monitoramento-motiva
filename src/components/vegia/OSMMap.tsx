import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
};

const statusColor = (s?: string) =>
  s === "critico" ? "hsl(0 72% 45%)" : s === "atencao" ? "hsl(35 85% 50%)" : "hsl(142 55% 40%)";

export const OSMMap = ({
  lat, lng, label, status, className,
  polyline, markers, zoom, fitBounds, onPointSelect, baseLayer = "satellite",
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
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
      try { map.off(); map.remove(); } catch { /* ignore */ }
      mapRef.current = null;
      layerGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseLayer]);

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

  return <div ref={containerRef} className={className} style={{ position: "relative", zIndex: 0 }} />;
};
