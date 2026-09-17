/**
 * Zona de decisão: converte altura estimada + limite contratual + incerteza
 * do modelo em uma recomendação rastreável.
 *
 * O modelo de altura (src/lib/height-model.ts) é uma regressão linear sobre o
 * índice composto NDVI+EVI+SAVI. O erro residual medido contra as medições de
 * campo é de ±2,9 cm no pior caso — valor validado, não uma precisão
 * centimétrica garantida em qualquer trecho.
 * Quando não houver incerteza calibrada para o segmento, o sistema declara
 * isso explicitamente em vez de inventar uma acurácia.
 */

/** Aviso curto sobre a natureza indireta da medição por satélite. */
export const SATELLITE_DISCLAIMER =
  "O satélite não mede altura diretamente. A altura mostrada é uma estimativa por modelo e deve ser conferida em campo quando estiver perto do limite contratual.";

/** Resíduo base (± cm) do modelo composto NDVI+EVI+SAVI, medido por validação
 *  cruzada (deixa-uma-régua-de-fora) contra a média do trecho: MAE 1,0 cm,
 *  RMSE 1,3 cm, pior caso 2,9 cm — com composto de 12 imagens Sentinel-2 e ao
 *  menos 5 réguas por local. A incerteza efetiva de cada trecho é maior quando
 *  a leitura é heterogênea, antiga ou saturada — ver `segmentUncertainty`. */
export const MODEL_UNCERTAINTY_CM = 2.9;
export const HEIGHT_MODEL_ID = "composite-ndvi-evi-savi";
export const HEIGHT_MODEL_VERSION = "v2.0 (recalibrado com 10 réguas em 2 locais)";
export const HEIGHT_MODEL_UPDATED_AT = "2026-09-17";

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

/** Rótulo padrão do conceito — nunca usar a palavra "precisão". */
export const UNCERTAINTY_LABEL = "Incerteza estimada da altura";

/** Texto único de tooltip do conceito de incerteza. */
export const UNCERTAINTY_TOOLTIP =
  "A incerteza é uma margem estatística estimada pelo modelo. Ela não representa resolução espacial do satélite nem garante medição contratual. Consulte a validação do modelo e confirme em campo quando a faixa de incerteza tocar ou cruzar o limite aplicável.";

/** Frase exigida sempre que a decisão contratual depender de estimativa. */
export const FIELD_CONFIRMATION_MESSAGE =
  "Evidência: estimativa de satélite + modelo. A confirmação para fins contratuais deve ser realizada em campo.";

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
      title: "Provavelmente conforme — monitoramento remoto",
      recommendation:
        "Mesmo no pior caso da incerteza, a estimativa fica abaixo do limite contratual. Manter monitoramento remoto.",
      summary: base,
      needsFieldValidation: false,
      uncertaintyCm, lower, upper,
    };
  }

  if (lower >= limite) {
    return {
      zone: "alto",
      title: "Provavelmente não conforme — priorizar inspeção",
      recommendation:
        "Mesmo no melhor caso da incerteza, a estimativa ultrapassa o limite contratual. Priorizar inspeção e intervenção.",
      summary: base,
      needsFieldValidation: true,
      uncertaintyCm, lower, upper,
    };
  }

  return {
    zone: "validar",
    title: "Zona de incerteza — validar em campo",
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
export const segmentUncertainty = (
  seg?: { uncertaintyCm?: number | null } | null,
  /** Resíduo base vigente: a calibração de campo, quando publicada. */
  fallbackCm: number = MODEL_UNCERTAINTY_CM,
): number =>
  seg?.uncertaintyCm != null && Number.isFinite(seg.uncertaintyCm) && seg.uncertaintyCm > 0
    ? Math.round(seg.uncertaintyCm * 10) / 10
    : fallbackCm;


export const ZONE_CLASS: Record<DecisionZone, string> = {
  baixo: "bg-primary/10 text-primary border-primary/25",
  validar: "bg-tertiary/12 text-tertiary border-tertiary/30",
  alto: "bg-destructive/10 text-destructive border-destructive/25",
  nao_calibrado: "bg-muted text-muted-foreground border-border",
};
