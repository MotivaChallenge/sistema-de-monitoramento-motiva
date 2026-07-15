import type { Segment } from "@/types/domain";

/**
 * IRC — Índice de Risco de Crescimento (0–100)
 * Regra de negócio Motiva: combina cobertura vegetal (NDVI), altura
 * atual da vegetação vs. limite contratual, dias desde a última roçada
 * e impacto da chuva prevista (mm nos próximos 5 dias).
 *
 *   IRC = 35*ndviN + 30*alturaN + 20*idadeN + 15*chuvaN
 *
 * - ndviN     = clamp((ndvi - 0.2) / 0.6)
 * - alturaN   = clamp(altura / limite)
 * - idadeN    = clamp(diasDesdeRocada / 90)
 * - chuvaN    = clamp(rainMm5d / 80)
 */
export interface IRCInputs {
  ndvi: number;
  altura: number;
  limite: number;
  ultimaRocada: string; // ISO ou "YYYY-MM-DD"
  rainMm5d?: number;
}
export type IRCLevel = "baixo" | "moderado" | "alto" | "critico";

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

export const daysSince = (iso: string): number => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86_400_000));
};

export const computeIRC = (i: IRCInputs): { score: number; level: IRCLevel } => {
  const ndviN = clamp((i.ndvi - 0.2) / 0.6);
  const alturaN = clamp(i.altura / Math.max(1, i.limite));
  const idadeN = clamp(daysSince(i.ultimaRocada) / 90);
  const chuvaN = clamp((i.rainMm5d ?? 0) / 80);
  const score = Math.round(35 * ndviN + 30 * alturaN + 20 * idadeN + 15 * chuvaN);
  const level: IRCLevel =
    score >= 75 ? "critico" : score >= 55 ? "alto" : score >= 35 ? "moderado" : "baixo";
  return { score, level };
};

export const ircForSegment = (s: Segment, rainMm5d = 0) =>
  computeIRC({ ndvi: s.ndvi, altura: s.altura, limite: s.limite, ultimaRocada: s.ultimaRocada, rainMm5d });

export const ircLevelLabel: Record<IRCLevel, string> = {
  baixo: "BAIXO",
  moderado: "MODERADO",
  alto: "ALTO",
  critico: "CRÍTICO",
};

export const ircLevelClass = (l: IRCLevel) =>
  l === "critico"
    ? "text-destructive bg-destructive/10"
    : l === "alto"
    ? "text-tertiary bg-tertiary/10"
    : l === "moderado"
    ? "text-primary bg-primary/10"
    : "text-turquoise bg-turquoise/10";