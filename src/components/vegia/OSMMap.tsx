import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon paths (Vite doesn't resolve Leaflet's default assets)
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
  return (
    <div className={className} style={{ position: "relative", zIndex: 0 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <Circle
          center={[lat, lng]}
          radius={120}
          pathOptions={{ color: statusColor(status), fillColor: statusColor(status), fillOpacity: 0.25 }}
        />
        <Marker position={[lat, lng]} icon={icon}>
          <Popup>
            <strong>{label ?? "Localização"}</strong>
            <br />
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};