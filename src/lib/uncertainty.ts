/**
 * Zona de decisão: converte altura estimada + limite contratual + incerteza
 * do modelo em uma recomendação rastreável.
 *
 * O modelo de altura (src/lib/height-model.ts) é uma regressão linear sobre o
 * NDVI. O erro residual observado nas comparações com medições de campo é da
 * ordem de ±13 cm — valor documentado, não uma precisão centimétrica.
 * Quando não houver incerteza calibrada para o segmento, o sistema declara
 * isso explicitamente em vez de inventar uma acurácia.
 */

/** Resíduo base (± cm) do modelo de altura por NDVI, documentado na auditoria GEE.
 *  A incerteza efetiva de cada trecho é maior quando a leitura é heterogênea,
 *  antiga ou saturada — ver `segmentUncertainty`. */
export const MODEL_UNCERTAINTY_CM = 13;
export const HEIGHT_MODEL_ID = "ndvi-linear";
export const HEIGHT_MODEL_VERSION = "v1.0 (não recalibrado)";
export const HEIGHT_MODEL_UPDATED_AT = "2026-02-01";

export type DecisionZone = "baixo" | "validar" | "alto" | "nao_calibrado";

export interface DecisionResult {
  zone: DecisionZone;
  title: string;
  /** Frase de decisão recomendada. */
  recommendation: string;
  /** Linha resumida: "Estimativa: 27 cm ± 13 cm · Limite: 30 cm". */
  summary: string;
  needsFieldValidation: boolean;
  uncertaintyCm: number | null;
  lower: number | null;
  upper: number | null;
}

export interface DecisionInput {
  /** Altura estimada em cm. */
  altura: number;
  /** Limite contratual do ativo em cm (30, 45, 60…). */
  limite: number;
  /** Incerteza calibrada para o segmento; `null` = não calibrada. */
  uncertaintyCm?: number | null;
  /** Quando true, o valor é medição de campo (sem zona de incerteza). */
  measured?: boolean;
}

export const UNCALIBRATED_MESSAGE =
  "Margem de incerteza ainda não calibrada para este segmento. A decisão contratual exige validação de campo.";

export const evaluateDecision = ({
  altura,
  limite,
  uncertaintyCm = MODEL_UNCERTAINTY_CM,
  measured = false,
}: DecisionInput): DecisionResult => {
  const fmt = (n: number) => `${Math.round(n)} cm`;

  if (measured) {
    const above = altura > limite;
    return {
      zone: above ? "alto" : "baixo",
      title: above ? "Acima do limite — medição de campo" : "Dentro do limite — medição de campo",
      recommendation: above
        ? "Medição presencial acima do limite contratual: priorizar intervenção."
        : "Medição presencial dentro do limite contratual.",
      summary: `Medido em campo: ${fmt(altura)} · Limite: ${fmt(limite)}`,
      needsFieldValidation: false,
      uncertaintyCm: 0,
      lower: altura,
      upper: altura,
    };
  }

  if (uncertaintyCm == null || !Number.isFinite(uncertaintyCm)) {
    return {
      zone: "nao_calibrado",
      title: "Incerteza não calibrada",
      recommendation: UNCALIBRATED_MESSAGE,
      summary: `Estimativa: ${fmt(altura)} · Limite: ${fmt(limite)} · Incerteza não calibrada`,
      needsFieldValidation: true,
      uncertaintyCm: null,
      lower: null,
      upper: null,
    };
  }

  const lower = altura - uncertaintyCm;
  const upper = altura + uncertaintyCm;
  const u = Math.round(uncertaintyCm * 10) / 10;
  const base = `Estimativa: ${fmt(altura)} ± ${u} cm · Limite: ${fmt(limite)}`;

  if (upper < limite) {
    return {
      zone: "baixo",
      title: "Baixo risco — monitoramento remoto",
      recommendation:
        "Mesmo no pior caso da incerteza, a estimativa fica abaixo do limite contratual. Manter monitoramento remoto.",
      summary: base,
      needsFieldValidation: false,
      uncertaintyCm, lower, upper,
    };
  }

  if (lower > limite) {
    return {
      zone: "alto",
      title: "Alto risco — priorizar inspeção/intervenção",
      recommendation:
        "Mesmo no melhor caso da incerteza, a estimativa ultrapassa o limite contratual. Priorizar inspeção e intervenção.",
      summary: base,
      needsFieldValidation: true,
      uncertaintyCm, lower, upper,
    };
  }

  return {
    zone: "validar",
    title: "Zona de validação — confirmar em campo",
    recommendation:
      "A faixa de incerteza cruza o limite contratual. Validar em campo antes de concluir conformidade ou inconformidade.",
    summary: `${base} · Zona de decisão: validar em campo`,
    needsFieldValidation: true,
    uncertaintyCm, lower, upper,
  };
};

/**
 * Incerteza efetiva de um trecho: usa o valor calculado na leitura do satélite
 * quando existir; senão cai no resíduo base do modelo.
 */
export const segmentUncertainty = <T extends { uncertaintyCm?: number | null }>(seg: T): number =>
  seg.uncertaintyCm != null && Number.isFinite(seg.uncertaintyCm) && seg.uncertaintyCm > 0
    ? Math.round(seg.uncertaintyCm * 10) / 10
    : MODEL_UNCERTAINTY_CM;

export const ZONE_CLASS: Record<DecisionZone, string> = {
  baixo: "bg-primary/10 text-primary border-primary/25",
  validar: "bg-tertiary/12 text-tertiary border-tertiary/30",
  alto: "bg-destructive/10 text-destructive border-destructive/25",
  nao_calibrado: "bg-muted text-muted-foreground border-border",
};

export const SATELLITE_DISCLAIMER =
  "O satélite não mede diretamente a altura da vegetação em centímetros. Ele fornece imagens e índices espectrais usados para identificar tendência, cobertura e risco. A altura apresentada pelo sistema é uma estimativa calibrada por modelo e deve ser validada em campo quando estiver próxima do limite contratual.";
