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

export const segments: Segment[] = [
  {
    id: "12-400",
    km: "KM 12+400",
    kmStart: 12.4, kmEnd: 13.1,
    tipo: "Roçada Mecânica",
    ndvi: 0.24, altura: 180, limite: 30, status: "critico",
    clausula: "CL-04.2",
    clauseFull: 'CLÁUSULA ARTESP ANEXO 6 §B.1.1 — "A CONCESSIONÁRIA DEVERÁ MANTER A VEGETAÇÃO COM ALTURA MÁXIMA DE 30 CM NOS TALUDES E ÁREAS ADJACENTES À PISTA DE ROLAMENTO. INTERFERÊNCIA EM FAIXA DE VISIBILIDADE OPERACIONAL REQUER INTERVENÇÃO IMEDIATA."',
    ultimaRocada: "29/03/2026",
    deadline: "18/04/2026 08:00",
    deadlineUrgent: true,
    notificationId: "#412",
    insight: "Crescimento acelerado nos últimos 12 dias (+14cm) correlaciona-se com a pluviosidade atípica registrada na Estação Meteorológica E-02. O NDVI de 0,24 indica obstrução ativa da faixa de visibilidade. Recomendação: Mobilização imediata de equipe de roçada mecanizada para evitar multa ARTESP escalonada no Anexo 6.",
    street: { lat: -23.54, lng: -46.63, caption: "Visual confirmado: Vegetação obstruindo parcialmente a sinalização vertical K-12." },
    detection: { label: "Grama Crítica", confidence: 89.4, classe: "Poaceae" },
  },
  {
    id: "18-150",
    km: "KM 18+150", kmStart: 18.15, kmEnd: 18.8,
    tipo: "Roçada Manual",
    ndvi: 0.42, altura: 60, limite: 30, status: "atencao",
    clausula: "CL-04.5",
    clauseFull: 'CLÁUSULA ARTESP ANEXO 6 §B.1.5 — "CRESCIMENTO ACELERADO DETECTADO. MONITORAMENTO EM 48H REQUERIDO PARA AVALIAR NECESSIDADE DE ROÇADA CORRETIVA."',
    ultimaRocada: "12/03/2026",
    deadline: "30/04/2026 12:00",
    insight: "Tendência de crescimento estável. Sugestão: agendar roçada preventiva em até 14 dias.",
    street: { lat: -23.55, lng: -46.61, caption: "Faixa de domínio com vegetação em fase de atenção." },
    detection: { label: "Vegetação Densa", confidence: 76.1, classe: "Mista" },
  },
  {
    id: "22-900",
    km: "KM 22+900", kmStart: 22.9, kmEnd: 23.6,
    tipo: "Limpeza de Drenagem",
    ndvi: 0.18, altura: 220, limite: 30, status: "critico",
    clausula: "CL-04.1",
    clauseFull: 'CLÁUSULA ARTESP ANEXO 6 §B.1.0 — "OBSTRUÇÃO DE DRENAGEM POR BIOMASSA. RISCO DE EROSÃO ELEVADO. INTERVENÇÃO PRIORITÁRIA EM 24H."',
    ultimaRocada: "01/03/2026",
    deadline: "17/04/2026 06:00",
    deadlineUrgent: true,
    notificationId: "#418",
    insight: "Drenagem comprometida. Risco de erosão pluvial em evento >20mm/h.",
    street: { lat: -23.56, lng: -46.59, caption: "Drenagem obstruída por biomassa acumulada." },
    detection: { label: "Obstrução Drenagem", confidence: 92.3, classe: "Detrito + Vegetação" },
  },
  {
    id: "5-800",
    km: "KM 5+800", kmStart: 5.8, kmEnd: 7.2,
    tipo: "Roçada Mecânica",
    ndvi: 0.71, altura: 34, limite: 30, status: "critico",
    clausula: "CL-04.2",
    clauseFull: 'CLÁUSULA ARTESP ANEXO 6 §B.1.1 — "A CONCESSIONÁRIA DEVERÁ MANTER A VEGETAÇÃO COM ALTURA MÁXIMA DE 30 CM NOS TALUDES E ÁREAS ADJACENTES À PISTA DE ROLAMENTO..."',
    ultimaRocada: "29/03/2026",
    deadline: "18/04/2026 08:00",
    deadlineUrgent: true,
    notificationId: "#412",
    insight: "O crescimento acelerado observado nos últimos 12 dias (+14cm) correlaciona-se com a pluviosidade atípica registrada na Estação Meteorológica E-02. O NDVI de 0,71 indica saturação clorofílica. Recomendação: Mobilização imediata de equipe de roçada mecanizada para evitar multa ARTESP escalonada no Anexo 6.",
    street: { lat: -23.54, lng: -46.63, caption: "Visual confirmado: Vegetação obstruindo parcialmente a sinalização vertical K-12." },
    detection: { label: "Grama Crítica", confidence: 89.4, classe: "Poaceae" },
  },
  {
    id: "25-200",
    km: "KM 25+200", kmStart: 25.2, kmEnd: 26.0,
    tipo: "Conforme", ndvi: 0.55, altura: 18, limite: 30, status: "conforme",
    clausula: "C.4.1.2/26",
    clauseFull: 'Conformidade vigente conforme última inspeção.',
    ultimaRocada: "05/04/2026",
  },
  {
    id: "8-100",
    km: "KM 8+100", kmStart: 8.1, kmEnd: 9.0,
    tipo: "Conforme", ndvi: 0.62, altura: 22, limite: 30, status: "conforme",
    clausula: "C.4.2.0/26",
    clauseFull: 'Conformidade vigente.',
    ultimaRocada: "08/04/2026",
  },
];

export const ndviHeatmap = [
  { from: 0, to: 4, status: "conforme" as Status },
  { from: 4, to: 7, status: "atencao" as Status },
  { from: 7, to: 11, status: "conforme" as Status },
  { from: 11, to: 13.5, status: "critico" as Status },
  { from: 13.5, to: 18, status: "conforme" as Status },
  { from: 18, to: 19, status: "atencao" as Status },
  { from: 19, to: 22, status: "conforme" as Status },
  { from: 22, to: 24, status: "critico" as Status },
  { from: 24, to: 27, status: "atencao" as Status },
  { from: 27, to: 29.3, status: "conforme" as Status },
];

export const ndviTrend = [
  { label: "L1", value: 0.61 },
  { label: "L2", value: 0.58 },
  { label: "L3", value: 0.55 },
  { label: "L4", value: 0.49 },
  { label: "L5", value: 0.52 },
  { label: "L6", value: 0.54 },
];

export const segmentEvolution = [
  { date: "20 MAR", value: 16 },
  { date: "25 MAR", value: 19 },
  { date: "30 MAR", value: 22 },
  { date: "04 ABR", value: 26 },
  { date: "09 ABR", value: 28 },
  { date: "14 ABR", value: 32 },
  { date: "HOJE", value: 34 },
];

export const cvImages = [
  { id: 1, km: "KM 5+820", label: "VEGETACAO_DENS", confidence: 94.2, status: "atencao" as Status, caption: "Invasão de faixa de domínio detectada na borda direita.", box: { x: 22, y: 28, w: 28, h: 30 } },
  { id: 2, km: "KM 6+150", label: "TRECHO_CONFORME", confidence: 99.1, status: "conforme" as Status, caption: "Visibilidade de sinalização horizontal preservada.", box: { x: 38, y: 38, w: 24, h: 22 } },
  { id: 3, km: "KM 6+400", label: "BURACO_PISTA", confidence: 82.8, status: "critico" as Status, caption: "Fadiga asfáltica com início de fissuração.", box: { x: 40, y: 30, w: 18, h: 16 } },
  { id: 4, km: "KM 6+720", label: "ROCADA_OK", confidence: 96.5, status: "conforme" as Status, caption: "Roçada recente confirmada. Faixa de domínio limpa." },
  { id: 5, km: "KM 6+950", label: "EROSAO_TALUDE", confidence: 71.4, status: "atencao" as Status, caption: "Instabilidade de talude detectada em encosta sul.", box: { x: 44, y: 32, w: 22, h: 22 } },
  { id: 6, km: "KM 7+200", label: "GEOMETRIA_OK", confidence: 98.2, status: "conforme" as Status, caption: "Geometria da via conforme projeto original." },
];
