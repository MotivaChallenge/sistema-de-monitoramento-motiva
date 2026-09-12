/**
 * Conjunto demonstrativo coerente para exercitar o modelo composto
 * (NDVI/EVI/SAVI → altura estimada → prioridade logística).
 *
 * Nada aqui é medição de campo nem leitura contratual: são valores mockados
 * usados para validar o fluxo de decisão e a priorização das equipes.
 */
import {
  evaluateSegmentModel, VEGETATION_MODEL, type HeightDecisionStatus, type PriorityLevel,
} from "@/lib/vegetation-model";

export interface DemoSegmentInput {
  segmentId: string;
  road: string;
  km: string;
  vegetationType: string;
  ndvi: number;
  evi: number;
  savi: number;
  rainfall5dMm: number;
  daysSinceLastMowing: number;
  contractualLimitCm?: number;
  /** Por que este trecho existe na demonstração. */
  cenario: string;
}

export interface DemoSegmentRow extends DemoSegmentInput {
  vegetationIndex: number;
  estimatedHeightCm: number;
  uncertaintyCm: number;
  contractualLimitCm: number;
  lowerBoundCm: number;
  upperBoundCm: number;
  distanceToLimitCm: number;
  heightDecisionStatus: HeightDecisionStatus;
  heightDecisionLabel: string;
  action: string;
  operationalPriorityScore: number;
  operationalPriorityLevel: PriorityLevel;
  needsFieldValidation: boolean;
  dataOrigin: "demonstrativo";
  modelVersion: string;
}

export const DEMO_SEGMENT_INPUTS: DemoSegmentInput[] = [
  {
    segmentId: "DEMO-01", road: "SP-021", km: "km 18+000", vegetationType: "talude",
    ndvi: 0.18, evi: 0.10, savi: 0.14, rainfall5dMm: 4, daysSinceLastMowing: 12,
    cenario: "Claramente abaixo do limite",
  },
  {
    segmentId: "DEMO-02", road: "SP-021", km: "km 21+500", vegetationType: "canteiro central",
    ndvi: 0.40, evi: 0.24, savi: 0.32, rainfall5dMm: 10, daysSinceLastMowing: 30,
    cenario: "Próximo do limite",
  },
  {
    segmentId: "DEMO-03", road: "SP-021", km: "km 24+200", vegetationType: "faixa de domínio",
    ndvi: 0.47, evi: 0.30, savi: 0.38, rainfall5dMm: 14, daysSinceLastMowing: 45,
    cenario: "Dentro da zona de incerteza",
  },
  {
    segmentId: "DEMO-04", road: "SP-021", km: "km 26+800", vegetationType: "talude",
    ndvi: 0.74, evi: 0.48, savi: 0.60, rainfall5dMm: 12, daysSinceLastMowing: 52,
    cenario: "Claramente acima do limite",
  },
  {
    segmentId: "DEMO-05", road: "SP-021", km: "km 29+100", vegetationType: "acostamento",
    ndvi: 0.52, evi: 0.34, savi: 0.44, rainfall5dMm: 78, daysSinceLastMowing: 26,
    cenario: "Chuva acumulada alta acelera o crescimento",
  },
  {
    segmentId: "DEMO-06", road: "SP-021", km: "km 31+600", vegetationType: "faixa de domínio",
    ndvi: 0.55, evi: 0.35, savi: 0.46, rainfall5dMm: 9, daysSinceLastMowing: 140,
    cenario: "Muito tempo desde a última roçada",
  },
  {
    segmentId: "DEMO-07", road: "SP-021", km: "km 33+400", vegetationType: "dispositivo de drenagem",
    ndvi: 0.82, evi: 0.55, savi: 0.68, rainfall5dMm: 62, daysSinceLastMowing: 96,
    cenario: "Trecho crítico para a logística (exemplo de referência)",
  },
];

/** Trecho usado como exemplo numérico de referência (0,82 / 0,55 / 0,68). */
export const DEMO_REFERENCE_ID = "DEMO-07";

export const evaluateDemoSegment = (input: DemoSegmentInput): DemoSegmentRow => {
  const r = evaluateSegmentModel({
    ndvi: input.ndvi, evi: input.evi, savi: input.savi,
    rainfall5dMm: input.rainfall5dMm,
    daysSinceLastMowing: input.daysSinceLastMowing,
    contractualLimitCm: input.contractualLimitCm,
  })!;
  return {
    ...input,
    vegetationIndex: r.indices.vegetationIndex,
    estimatedHeightCm: r.decision.estimatedHeightCm,
    uncertaintyCm: r.decision.uncertaintyCm,
    contractualLimitCm: r.decision.contractualLimitCm,
    lowerBoundCm: r.decision.lowerBoundCm,
    upperBoundCm: r.decision.upperBoundCm,
    distanceToLimitCm: r.decision.distanceToLimitCm,
    heightDecisionStatus: r.decision.status,
    heightDecisionLabel: r.decision.label,
    action: r.decision.action,
    operationalPriorityScore: r.priority.score,
    operationalPriorityLevel: r.priority.level,
    needsFieldValidation: r.decision.needsFieldValidation,
    dataOrigin: "demonstrativo",
    modelVersion: VEGETATION_MODEL.modelVersion,
  };
};

/** Linhas demonstrativas já calculadas, ordenadas por prioridade operacional. */
export const DEMO_SEGMENTS: DemoSegmentRow[] = DEMO_SEGMENT_INPUTS
  .map(evaluateDemoSegment)
  .sort((a, b) => b.operationalPriorityScore - a.operationalPriorityScore);

export const DEMO_REFERENCE_SEGMENT: DemoSegmentRow =
  DEMO_SEGMENTS.find(s => s.segmentId === DEMO_REFERENCE_ID)!;
