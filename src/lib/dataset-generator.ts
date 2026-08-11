import { estimateHeightCm } from "@/lib/height-model";
import { Segment, Status } from "@/types/domain";

export interface DatasetRow {
  data: string;            // ISO da leitura
  segmento_id: string;
  rodovia: string;
  km: string;
  km_inicio: number;
  tipo: string;
  ndvi: number;
  altura_estimada_cm: number;
  limite_cm: number;
  status: Status;
  ultima_rocada: string;   // ISO
  dias_desde_rocada: number;
  prazo_contratual: string | null; // ISO
  dias_para_prazo: number | null;
  rocada_executada: boolean;
}

export interface GenerateOptions {
  segments: Segment[];
  start: string;   // ISO
  end: string;     // ISO
  stepDays: number;
  seed?: number;
}

/** PRNG determinístico (mulberry32) — mesmo período + trecho geram o mesmo dataset. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);

/** Fator sazonal de crescimento: chuvas de outubro a março aceleram a vegetação. */
const seasonFactor = (month: number) => {
  const wet = month >= 9 || month <= 2;
  return wet ? 1.35 : 0.7;
};

const statusFor = (altura: number, limite: number): Status =>
  altura >= limite ? "critico" : altura >= limite * 0.8 ? "atencao" : "conforme";

const deadlineFor = (date: Date, status: Status): string | null =>
  status === "critico" ? iso(addDays(date, 7)) : status === "atencao" ? iso(addDays(date, 15)) : null;

/**
 * Gera séries realistas de NDVI/altura por trecho no período escolhido.
 * O NDVI cresce a partir da última roçada com ruído controlado; quando a altura
 * ultrapassa o limite contratual, uma roçada é registrada e a série reinicia.
 */
export const generateDataset = ({ segments, start, end, stepDays, seed = 7 }: GenerateOptions): DatasetRow[] => {
  const rows: DatasetRow[] = [];
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (endDate < startDate) return rows;

  for (const s of segments) {
    const rand = rng(hash(s.id) ^ seed);
    let ndvi = Math.min(0.82, Math.max(0.16, s.ndvi - 0.12 + rand() * 0.06));
    let ultimaRocada = /^\d{4}-\d{2}-\d{2}/.test(s.ultimaRocada)
      ? s.ultimaRocada.slice(0, 10)
      : iso(addDays(startDate, -30));

    for (let d = new Date(startDate); d <= endDate; d = addDays(d, stepDays)) {
      const growth = 0.0022 * stepDays * seasonFactor(d.getMonth()) * (0.75 + rand() * 0.6);
      ndvi = Math.min(0.86, ndvi + growth + (rand() - 0.5) * 0.012);
      const altura = estimateHeightCm(ndvi);
      const status = statusFor(altura, s.limite);
      const prazo = deadlineFor(d, status);
      const dateIso = iso(d);
      const executou = status === "critico" && rand() > 0.35;

      rows.push({
        data: dateIso,
        segmento_id: s.id,
        rodovia: s.rodovia ?? "—",
        km: s.km,
        km_inicio: s.kmStart,
        tipo: s.tipo,
        ndvi: Number(ndvi.toFixed(3)),
        altura_estimada_cm: altura,
        limite_cm: s.limite,
        status,
        ultima_rocada: ultimaRocada,
        dias_desde_rocada: Math.max(0, daysBetween(ultimaRocada, dateIso)),
        prazo_contratual: prazo,
        dias_para_prazo: prazo ? daysBetween(dateIso, prazo) : null,
        rocada_executada: executou,
      });

      if (executou) {
        ultimaRocada = dateIso;
        ndvi = 0.17 + rand() * 0.04; // rebrota após corte
      }
    }
  }
  return rows.sort((a, b) => a.data.localeCompare(b.data) || a.km_inicio - b.km_inicio);
};

export const datasetToCsv = (rows: DatasetRow[]): string => {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]) as (keyof DatasetRow)[];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
};

export const downloadFile = (name: string, content: string, mime: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
