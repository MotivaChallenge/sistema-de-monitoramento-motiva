/**
 * Ponte entre os trechos reais da malha e o Índice de Prioridade Operacional
 * definido em `vegetation-model.ts`.
 *
 * A prioridade NÃO é uma conclusão contratual: ela ordena o trabalho das
 * equipes combinando risco de altura estimada, vigor (NDVI), chuva acumulada
 * e tempo desde a última roçada.
 */
import { clamp, operationalPriority, type PriorityResult } from "@/lib/vegetation-model";

export interface PrioritySegmentLike {
  altura: number;
  limite: number;
  ndvi: number;
  ultimaRocada?: string | null;
}

/** Dias desde a última roçada; 0 quando a data é desconhecida ou futura. */
export const daysSinceMowing = (ultimaRocada?: string | null, now = new Date()): number => {
  if (!ultimaRocada) return 0;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(ultimaRocada) ? `${ultimaRocada}T00:00:00` : ultimaRocada);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
};

export const segmentPriority = (s: PrioritySegmentLike, rain5dMm: number, now = new Date()): PriorityResult =>
  operationalPriority({
    estimatedHeightCm: s.altura,
    // NDVI já é um índice 0–1 na faixa de vegetação; negativos são remapeados.
    ndviNormalized: clamp(s.ndvi < 0 ? (s.ndvi + 1) / 2 : s.ndvi),
    rainfall5dMm: rain5dMm,
    daysSinceLastMowing: daysSinceMowing(s.ultimaRocada, now),
    contractualLimitCm: s.limite,
  });
