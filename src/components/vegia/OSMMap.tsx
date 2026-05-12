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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Clear any leftover Leaflet state on the container (StrictMode double-invoke / HMR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((containerRef.current as any)._leaflet_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Base layers: OSM (street), Google Satellite, Google Hybrid (satellite + labels/roads)
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

    if (polyline && polyline.length > 1) {
      L.polyline(polyline, {
        color: "hsl(220 90% 55%)",
        weight: 4,
        opacity: 0.85,
      }).addTo(map);
    }

    if (markers && markers.length > 0) {
      markers.forEach((m) => {
        const dot = L.circleMarker([m.lat, m.lng], {
          radius: 7,
          color: statusColor(m.status),
          fillColor: statusColor(m.status),
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map);
        if (m.label) dot.bindPopup(`<strong>${m.label}</strong>`);
        dot.on("click", (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          if (onPointSelect) onPointSelect(m.lat, m.lng, m.label);
          else m.onClick?.();
        });
      });
    } else if (lat != null && lng != null) {
      L.circle([lat, lng], {
        radius: 120,
        color: statusColor(status),
        fillColor: statusColor(status),
        fillOpacity: 0.25,
      }).addTo(map);
      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${label ?? "Localização"}</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }

    if (onPointSelect) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onPointSelect(e.latlng.lat, e.latlng.lng);
      });
    }

    if (fitBounds) {
      const pts: [number, number][] = [
        ...(polyline ?? []),
        ...((markers ?? []).map(m => [m.lat, m.lng] as [number, number])),
      ];
      if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts), { padding: [20, 20] });
      }
    }

    return () => {
      try { map.off(); map.remove(); } catch { /* ignore */ }
      mapRef.current = null;
    };
  }, [lat, lng, label, status, polyline, markers, zoom, fitBounds, onPointSelect, baseLayer]);

  return <div ref={containerRef} className={className} style={{ position: "relative", zIndex: 0 }} />;
};
