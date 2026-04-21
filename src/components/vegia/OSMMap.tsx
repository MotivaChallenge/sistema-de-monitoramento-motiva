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

type Props = {
  lat: number;
  lng: number;
  label?: string;
  status?: "critico" | "atencao" | "conforme";
  className?: string;
};

const statusColor = (s?: string) =>
  s === "critico" ? "hsl(0 72% 45%)" : s === "atencao" ? "hsl(35 85% 50%)" : "hsl(142 55% 40%)";

export const OSMMap = ({ lat, lng, label, status, className }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
      attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    L.circle([lat, lng], {
      radius: 120,
      color: statusColor(status),
      fillColor: statusColor(status),
      fillOpacity: 0.25,
    }).addTo(map);

    L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`<strong>${label ?? "Localização"}</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, label, status]);

  return <div ref={containerRef} className={className} style={{ position: "relative", zIndex: 0 }} />;
};
