/**
 * Modelo DEMONSTRATIVO de vegetação → altura estimada → prioridade logística.
 *
 * Natureza do modelo (leia antes de usar em decisão contratual):
 *  - O satélite NÃO mede altura em centímetros. Os índices espectrais (NDVI,
 *    EVI, SAVI) entram como variáveis de um modelo que ESTIMA altura.
 *  - Os pesos (6:2:2) e o coeficiente de calibração (70 cm por unidade de
 *    índice) são demonstrativos e precisam de recalibração com medições
 *    georreferenciadas de campo antes de qualquer uso contratual.
 *  - A incerteza (± cm) é uma margem estimada pelo modelo, não uma precisão
 *    garantida nem resolução espacial do sensor.
 *
 * Toda a parametrização vive aqui: nenhum componente deve repetir 6, 2, 2,
 * 70, 30 ou 13 no código.
 */

export type IndexWeights = { ndvi: number; evi: number; savi: number };

export interface VegetationModelConfig {
  /** Pesos brutos do índice composto (somam 10 na versão demonstrativa). */
  weights: IndexWeights;
  heightCalibration: {
    interceptCm: number;
    vegetationIndexCoefficient: number;
    version: string;
    isDemonstrative: boolean;
    /** Forma alternativa prevista para quando houver campo: β0 + β1·NDVI + β2·EVI + β3·SAVI. */
    futureForm: string;
  };
  /** Limite contratual geral (cm). Ativos com cláusula própria sobrescrevem. */
  contractualHeightLimitCm: number;
  uncertainty: {
    valueCm: number;
    method: string;
    confidenceLevel: number | null;
    validationStatus: "pending" | "validated";
    isDemonstrative: boolean;
  };
  /** Pesos do Índice de Prioridade Operacional (somam 1). */
  priorityWeights: {
    heightRisk: number;
    ndvi: number;
    rainfall: number;
    daysSinceMowing: number;
  };
  /** Normalizações auxiliares da prioridade. */
  priorityScales: {
    /** Chuva acumulada em 5 dias que satura o componente (mm). */
    rainfall5dSaturationMm: number;
    /** Dias desde a última roçada que saturam o componente. */
    daysSinceMowingSaturation: number;
  };
  modelVersion: string;
}

export const VEGETATION_MODEL: VegetationModelConfig = {
  weights: { ndvi: 6, evi: 2, savi: 2 },
  heightCalibration: {
    interceptCm: 0,
    vegetationIndexCoefficient: 70,
    version: "mock-v1",
    isDemonstrative: true,
    futureForm: "altura_cm = β0 + β1·NDVI + β2·EVI + β3·SAVI (regressão a calibrar com campo)",
  },
  contractualHeightLimitCm: 30,
  uncertainty: {
    valueCm: 13,
    method: "mock-estimate",
    confidenceLevel: null,
    validationStatus: "pending",
    isDemonstrative: true,
  },
  priorityWeights: { heightRisk: 0.45, ndvi: 0.25, rainfall: 0.15, daysSinceMowing: 0.15 },
  priorityScales: { rainfall5dSaturationMm: 60, daysSinceMowingSaturation: 120 },
  modelVersion: "vegetacao-composta mock-v1",
};

/* ------------------------------------------------------------------ */
/* Normalização                                                        */
/* ------------------------------------------------------------------ */

export const clamp = (v: number, min = 0, max = 1): number =>
  !Number.isFinite(v) ? NaN : Math.min(max, Math.max(min, v));

const num = (v: number | null | undefined): number | null =>
  v == null || !Number.isFinite(v) ? null : v;

export interface SpectralInput {
  ndvi: number | null | undefined;
  evi: number | null | undefined;
  savi: number | null | undefined;
}

export interface NormalizedIndices {
  ndviNormalized: number;
  eviNormalized: number;
  saviNormalized: number;
  /** Índice composto em 0–1. */
  vegetationIndex: number;
}

/** Soma dos pesos — sempre derivada da configuração. */
export const weightSum = (w: IndexWeights = VEGETATION_MODEL.weights) => w.ndvi + w.evi + w.savi;

/**
 * Normaliza NDVI/EVI/SAVI para 0–1 e devolve o índice composto.
 *
 * Regra demonstrativa: valores negativos (água, asfalto, solo muito exposto)
 * são remapeados de [-1, 1] para [0, 1]; valores não negativos — a faixa em que
 * a vegetação efetivamente ocorre — são apenas limitados a [0, 1], preservando
 * a escala do índice na região de interesse.
 *
 * Retorna `null` quando algum índice está ausente — nunca calcula em silêncio.
 */
export const normalizeSpectralIndices = (
  { ndvi, evi, savi }: SpectralInput,
  weights: IndexWeights = VEGETATION_MODEL.weights
): NormalizedIndices | null => {
  const n = num(ndvi), e = num(evi), s = num(savi);
  if (n === null || e === null || s === null) return null;

  const norm = (x: number) => clamp(x < 0 ? (x + 1) / 2 : x);
  const ndviNormalized = norm(n);
  const eviNormalized = norm(e);
  const saviNormalized = norm(s);

  const total = weightSum(weights);
  const vegetationIndex = clamp(
    (weights.ndvi * ndviNormalized + weights.evi * eviNormalized + weights.savi * saviNormalized) / total
  );
  return { ndviNormalized, eviNormalized, saviNormalized, vegetationIndex };
};

/** Texto padrão quando faltam índices. */
export const INSUFFICIENT_DATA_MESSAGE =
  "Dados insuficientes: sem NDVI, EVI e SAVI para este trecho não é possível estimar altura nem concluir sobre o limite contratual.";

/* ------------------------------------------------------------------ */
/* Calibração em altura                                                */
/* ------------------------------------------------------------------ */

/** altura_cm = intercepto + coeficiente × índice composto (calibração demonstrativa). */
export const estimateHeightFromVegetationIndex = (
  vegetationIndex: number,
  cal = VEGETATION_MODEL.heightCalibration
): number => Math.max(0, cal.interceptCm + cal.vegetationIndexCoefficient * vegetationIndex);

/* ------------------------------------------------------------------ */
/* Decisão por faixa de incerteza                                      */
/* ------------------------------------------------------------------ */

export type HeightDecisionStatus =
  | "provavelmente_conforme"
  | "validar_em_campo"
  | "provavelmente_nao_conforme";

export const HEIGHT_DECISION_LABEL: Record<HeightDecisionStatus, string> = {
  provavelmente_conforme: "Provável conformidade",
  validar_em_campo: "Validar em campo",
  provavelmente_nao_conforme: "Provável não conformidade",
};

export const HEIGHT_DECISION_ACTION: Record<HeightDecisionStatus, string> = {
  provavelmente_conforme: "Manter monitoramento remoto",
  validar_em_campo: "Programar validação presencial antes de decidir",
  provavelmente_nao_conforme: "Priorizar inspeção e programação de roçada",
};

export interface HeightDecision {
  estimatedHeightCm: number;
  uncertaintyCm: number;
  lowerBoundCm: number;
  upperBoundCm: number;
  contractualLimitCm: number;
  /** estimativa − limite (positivo = acima do limite). */
  distanceToLimitCm: number;
  status: HeightDecisionStatus;
  label: string;
  action: string;
  needsFieldValidation: boolean;
}

export const evaluateHeightDecision = (
  estimatedHeightCm: number,
  contractualLimitCm = VEGETATION_MODEL.contractualHeightLimitCm,
  uncertaintyCm = VEGETATION_MODEL.uncertainty.valueCm
): HeightDecision => {
  const lowerBoundCm = estimatedHeightCm - uncertaintyCm;
  const upperBoundCm = estimatedHeightCm + uncertaintyCm;
  const status: HeightDecisionStatus =
    upperBoundCm < contractualLimitCm
      ? "provavelmente_conforme"
      : lowerBoundCm >= contractualLimitCm
        ? "provavelmente_nao_conforme"
        : "validar_em_campo";
  return {
    estimatedHeightCm,
    uncertaintyCm,
    lowerBoundCm,
    upperBoundCm,
    contractualLimitCm,
    distanceToLimitCm: estimatedHeightCm - contractualLimitCm,
    status,
    label: HEIGHT_DECISION_LABEL[status],
    action: HEIGHT_DECISION_ACTION[status],
    // A estimativa nunca fecha decisão contratual sozinha.
    needsFieldValidation: status !== "provavelmente_conforme",
  };
};

/* ------------------------------------------------------------------ */
/* Índice de Prioridade Operacional                                    */
/* ------------------------------------------------------------------ */

export type PriorityLevel = "baixa" | "media" | "alta" | "critica";

export const PRIORITY_LEVEL_LABEL: Record<PriorityLevel, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica",
};

export interface PriorityInput {
  estimatedHeightCm: number;
  ndviNormalized: number;
  rainfall5dMm: number;
  daysSinceLastMowing: number;
  contractualLimitCm?: number;
}

export interface PriorityResult {
  components: { heightRisk: number; ndvi: number; rainfall: number; daysSinceMowing: number };
  /** 0–1. */
  value: number;
  /** 0–100. */
  score: number;
  level: PriorityLevel;
}

export const priorityLevelFromScore = (score: number): PriorityLevel =>
  score >= 80 ? "critica" : score >= 60 ? "alta" : score >= 40 ? "media" : "baixa";

export const operationalPriority = ({
  estimatedHeightCm, ndviNormalized, rainfall5dMm, daysSinceLastMowing,
  contractualLimitCm = VEGETATION_MODEL.contractualHeightLimitCm,
}: PriorityInput): PriorityResult => {
  const w = VEGETATION_MODEL.priorityWeights;
  const sc = VEGETATION_MODEL.priorityScales;

  const heightRisk = estimatedHeightCm <= 0 ? 0 : clamp(estimatedHeightCm / contractualLimitCm);
  const ndvi = clamp(ndviNormalized);
  const rainfall = clamp(rainfall5dMm / sc.rainfall5dSaturationMm);
  const daysSinceMowing = clamp(daysSinceLastMowing / sc.daysSinceMowingSaturation);

  const value = clamp(
    w.heightRisk * heightRisk + w.ndvi * ndvi + w.rainfall * rainfall + w.daysSinceMowing * daysSinceMowing
  );
  const score = Math.round(value * 100);
  return {
    components: { heightRisk, ndvi, rainfall, daysSinceMowing },
    value,
    score,
    level: priorityLevelFromScore(score),
  };
};

/* ------------------------------------------------------------------ */
/* Avaliação completa de um trecho                                     */
/* ------------------------------------------------------------------ */

export interface SegmentModelInput extends SpectralInput {
  rainfall5dMm: number;
  daysSinceLastMowing: number;
  contractualLimitCm?: number;
  uncertaintyCm?: number;
}

export interface SegmentModelResult {
  indices: NormalizedIndices;
  decision: HeightDecision;
  priority: PriorityResult;
  modelVersion: string;
  isDemonstrative: boolean;
}

/** Avaliação ponta a ponta; `null` quando faltam índices (dados insuficientes). */
export const evaluateSegmentModel = (i: SegmentModelInput): SegmentModelResult | null => {
  const indices = normalizeSpectralIndices(i);
  if (!indices) return null;
  const heightCm = estimateHeightFromVegetationIndex(indices.vegetationIndex);
  const decision = evaluateHeightDecision(
    heightCm,
    i.contractualLimitCm ?? VEGETATION_MODEL.contractualHeightLimitCm,
    i.uncertaintyCm ?? VEGETATION_MODEL.uncertainty.valueCm
  );
  const priority = operationalPriority({
    estimatedHeightCm: heightCm,
    ndviNormalized: indices.ndviNormalized,
    rainfall5dMm: i.rainfall5dMm,
    daysSinceLastMowing: i.daysSinceLastMowing,
    contractualLimitCm: decision.contractualLimitCm,
  });
  return {
    indices, decision, priority,
    modelVersion: VEGETATION_MODEL.modelVersion,
    isDemonstrative: VEGETATION_MODEL.heightCalibration.isDemonstrative,
  };
};

/* ------------------------------------------------------------------ */
/* Textos de transparência (fonte única)                               */
/* ------------------------------------------------------------------ */

export const MODEL_FORMULA_TEXT =
  `Índice de Vegetação = ${(VEGETATION_MODEL.weights.ndvi / weightSum()).toFixed(1).replace(".", ",")} × NDVI` +
  ` + ${(VEGETATION_MODEL.weights.evi / weightSum()).toFixed(1).replace(".", ",")} × EVI` +
  ` + ${(VEGETATION_MODEL.weights.savi / weightSum()).toFixed(1).replace(".", ",")} × SAVI (índices normalizados em 0–1)`;

export const MODEL_HEIGHT_TEXT =
  `Altura estimada = ${VEGETATION_MODEL.heightCalibration.vegetationIndexCoefficient} × Índice de Vegetação` +
  (VEGETATION_MODEL.heightCalibration.interceptCm ? ` + ${VEGETATION_MODEL.heightCalibration.interceptCm} cm` : "");

export const MODEL_METHOD_TEXT =
  `Modelo demonstrativo: ${MODEL_FORMULA_TEXT}. ${MODEL_HEIGHT_TEXT}. ` +
  "Os pesos e coeficientes são demonstrativos e devem ser recalibrados com medições georreferenciadas de campo antes do uso contratual.";

export const SATELLITE_NOT_A_RULER_TEXT =
  "O satélite não mede diretamente a altura da vegetação em centímetros. Os índices espectrais são usados como variáveis de entrada para uma estimativa de modelo.";

export const DEMO_DATA_TEXT =
  "Os dados desta versão são demonstrativos e servem para validar o fluxo de decisão e logística.";

export const UNCERTAINTY_EXPLANATION_TEXT =
  "A incerteza é uma margem estimada pelo modelo demonstrativo. Ela não representa a resolução espacial do satélite nem garante uma medição contratual. A confirmação definitiva deve ser feita em campo quando necessário.";

export const FIELD_VALIDATION_TEXT =
  "Quando a faixa de incerteza toca ou cruza o limite contratual, o sistema recomenda validação presencial.";

export const NON_CONFORMITY_TEXT =
  "Uma classificação de provável não conformidade serve para priorização operacional e não substitui a medição de campo exigida para decisão contratual.";
