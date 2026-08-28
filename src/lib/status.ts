import type { Status } from "@/types/domain";

/**
 * Limiares de altura (cm) definidos em /configuracoes.
 * Servem para derivar o status do trecho a partir da altura medida,
 * em vez de confiar apenas no valor gravado no banco.
 */
export interface HeightThresholds {
  atencao: number;
  critico: number;
}

export const DEFAULT_HEIGHT_THRESHOLDS: HeightThresholds = { atencao: 15, critico: 30 };

let activeThresholds: HeightThresholds = { ...DEFAULT_HEIGHT_THRESHOLDS };

/** Aplica os limiares definidos pelo usuário (chamado pelo SettingsProvider). */
export const setHeightThresholds = (t: Partial<HeightThresholds>) => {
  activeThresholds = { ...DEFAULT_HEIGHT_THRESHOLDS, ...t };
};

export const getHeightThresholds = (): HeightThresholds => activeThresholds;

/** critico >= altura_critica_cm; atencao >= altura_atencao_cm; senão conforme. */
export const statusFromAltura = (
  altura: number,
  t: HeightThresholds = activeThresholds,
): Status => {
  if (!Number.isFinite(altura)) return "conforme";
  if (altura >= t.critico) return "critico";
  if (altura >= t.atencao) return "atencao";
  return "conforme";
};
