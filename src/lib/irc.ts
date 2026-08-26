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
  weights?: IRCWeights;
}
export type IRCLevel = "baixo" | "moderado" | "alto" | "critico";

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

/** Pesos do IRC — configuráveis em /configuracoes (soma = 100). */
export interface IRCWeights { ndvi: number; altura: number; idade: number; chuva: number; }
export const DEFAULT_IRC_WEIGHTS: IRCWeights = { ndvi: 35, altura: 30, idade: 20, chuva: 15 };

let activeWeights: IRCWeights = { ...DEFAULT_IRC_WEIGHTS };
/** Aplica os pesos definidos pelo usuário (chamado pelo SettingsProvider). */
export const setIRCWeights = (w: Partial<IRCWeights>) => {
  activeWeights = { ...DEFAULT_IRC_WEIGHTS, ...w };
};
export const getIRCWeights = (): IRCWeights => activeWeights;

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
  const w = i.weights ?? activeWeights;
  const score = Math.round(w.ndvi * ndviN + w.altura * alturaN + w.idade * idadeN + w.chuva * chuvaN);
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