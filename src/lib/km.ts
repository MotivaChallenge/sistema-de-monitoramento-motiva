/** Utilitários de precisão quilométrica (km + metros) e geolocalização na rodovia. */

export interface LatLng { lat: number; lng: number }
export interface KmPoint extends LatLng { km: number }

/** Formata 12.45 como "km 12+450" (precisão de metro). */
export const formatKmPrecise = (km: number): string => {
  const safe = Number.isFinite(km) ? Math.max(0, km) : 0;
  const inteiro = Math.floor(safe);
  const metros = Math.round((safe - inteiro) * 1000);
  if (metros === 1000) return `km ${inteiro + 1}+000`;
  return `km ${inteiro}+${String(metros).padStart(3, "0")}`;
};

/** Formata um intervalo com precisão de metro. */
export const formatKmRange = (start: number, end: number): string =>
  `${formatKmPrecise(start)} → ${formatKmPrecise(end)}`;

/** Extensão do trecho em metros. */
export const kmExtentMeters = (start: number, end: number): number =>
  Math.max(0, Math.round((end - start) * 1000));

const R = 6371000;
const toRad = (v: number) => (v * Math.PI) / 180;

/** Distância haversine em metros. */
export const haversine = (a: LatLng, b: LatLng): number => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Interpola a coordenada exata de um km a partir dos marcos da rodovia. */
export const coordsForKm = (markers: KmPoint[], km: number): LatLng | null => {
  const marks = [...markers].sort((a, b) => a.km - b.km);
  if (!marks.length) return null;
  if (km <= marks[0].km) return { lat: marks[0].lat, lng: marks[0].lng };
  const last = marks[marks.length - 1];
  if (km >= last.km) return { lat: last.lat, lng: last.lng };
  for (let i = 0; i < marks.length - 1; i++) {
    const a = marks[i];
    const b = marks[i + 1];
    if (km >= a.km && km <= b.km) {
      const t = b.km === a.km ? 0 : (km - a.km) / (b.km - a.km);
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
  }
  return null;
};

/**
 * Projeta uma coordenada sobre o eixo da rodovia e devolve o km exato
 * (interpolado dentro do segmento mais próximo) e o desvio lateral em metros.
 */
export const kmForCoords = (
  markers: KmPoint[],
  point: LatLng
): { km: number; offsetMeters: number } | null => {
  const marks = [...markers].sort((a, b) => a.km - b.km);
  if (!marks.length) return null;
  if (marks.length === 1) {
    return { km: marks[0].km, offsetMeters: Math.round(haversine(marks[0], point)) };
  }

  let best: { km: number; offsetMeters: number } | null = null;
  for (let i = 0; i < marks.length - 1; i++) {
    const a = marks[i];
    const b = marks[i + 1];
    // projeção escalar em espaço plano local (suficiente em escala de km)
    const cos = Math.cos(toRad((a.lat + b.lat) / 2));
    const ax = 0, ay = 0;
    const bx = (b.lng - a.lng) * cos, by = b.lat - a.lat;
    const px = (point.lng - a.lng) * cos, py = point.lat - a.lat;
    const len2 = bx * bx + by * by;
    const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * bx + (py - ay) * by) / len2));
    const proj = { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    const dist = haversine(proj, point);
    if (!best || dist < best.offsetMeters) {
      best = { km: a.km + (b.km - a.km) * t, offsetMeters: dist };
    }
  }
  return best ? { km: Number(best.km.toFixed(3)), offsetMeters: Math.round(best.offsetMeters) } : null;
};
