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
  status: Status;
  clausula: string;
  clauseFull: string;
  ultimaRocada: string;
  deadline?: string;
  deadlineUrgent?: boolean;
  notificationId?: string;
  insight?: string;
  street?: { lat: number; lng: number; caption: string };
  detection?: { label: string; confidence: number; classe: string };
}
