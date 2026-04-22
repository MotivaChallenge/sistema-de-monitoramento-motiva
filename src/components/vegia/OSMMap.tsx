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
};

const statusColor = (s?: string) =>
  s === "critico" ? "hsl(0 72% 45%)" : s === "atencao" ? "hsl(35 85% 50%)" : "hsl(142 55% 40%)";

export const OSMMap = ({
  lat, lng, label, status, className,
  polyline, markers, zoom, fitBounds,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const centerLat = lat ?? markers?.[0]?.lat ?? polyline?.[0]?.[0] ?? -23.5505;
    const centerLng = lng ?? markers?.[0]?.lng ?? polyline?.[0]?.[1] ?? -46.6333;
    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: zoom ?? 15,
      scrollWheelZoom: false,
      attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

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
        if (m.onClick) dot.on("click", () => m.onClick?.());
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
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, label, status, polyline, markers, zoom, fitBounds]);

  return <div ref={containerRef} className={className} style={{ position: "relative", zIndex: 0 }} />;
};
