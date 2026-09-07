export type Status = "critico" | "atencao" | "conforme";

export interface Segment {
  id: string;
  km: string;
  kmStart: number;
  kmEnd: number;
  tipo: string;
  ndvi: number;
  altura: number; // cm
  limite: number; // cm
  status: Status; // derivado dos limiares de altura configurados
  /** Status originalmente gravado no banco (antes dos limiares do usuário). */
  statusBanco?: Status;
  /** Incerteza (± cm) calculada na última leitura orbital deste trecho. */
  uncertaintyCm?: number | null;
  /** Origem do NDVI/altura: carga inicial (demonstrativo) ou Sentinel-2 real. */
  ndviSource?: "seed" | "sentinel2";
  lastSatelliteReadAt?: string | null;
  satelliteImages?: number | null;
  satelliteValidPixels?: number | null;
  clausula: string;
  clauseFull: string;
  ultimaRocada: string;
  rodovia?: string;
  deadline?: string;
  deadlineUrgent?: boolean;
  notificationId?: string;
  insight?: string;
  street?: { lat: number; lng: number; caption: string };
  detection?: { label: string; confidence: number; classe: string };
}
