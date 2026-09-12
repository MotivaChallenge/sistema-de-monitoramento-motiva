import { describe, expect, it } from "vitest";
import {
  VEGETATION_MODEL, normalizeSpectralIndices, estimateHeightFromVegetationIndex,
  evaluateHeightDecision, operationalPriority, evaluateSegmentModel, weightSum, clamp,
} from "@/lib/vegetation-model";
import { DEMO_SEGMENTS, DEMO_REFERENCE_SEGMENT } from "@/lib/demo-model-data";

describe("índice composto", () => {
  it("usa pesos 6:2:2 somando 10", () => {
    expect(VEGETATION_MODEL.weights).toEqual({ ndvi: 6, evi: 2, savi: 2 });
    expect(weightSum()).toBe(10);
  });

  it("reproduz o exemplo de referência 0,82 / 0,55 / 0,68 → 0,738", () => {
    const r = normalizeSpectralIndices({ ndvi: 0.82, evi: 0.55, savi: 0.68 })!;
    expect(r.vegetationIndex).toBeCloseTo(0.738, 6);
  });

  it("resulta sempre entre 0 e 1", () => {
    for (const v of [-1, -0.3, 0, 0.5, 1, 2.5]) {
      const r = normalizeSpectralIndices({ ndvi: v, evi: v, savi: v })!;
      expect(r.vegetationIndex).toBeGreaterThanOrEqual(0);
      expect(r.vegetationIndex).toBeLessThanOrEqual(1);
    }
  });

  it("retorna null quando falta algum índice", () => {
    expect(normalizeSpectralIndices({ ndvi: 0.5, evi: null, savi: 0.4 })).toBeNull();
    expect(normalizeSpectralIndices({ ndvi: 0.5, evi: 0.3, savi: undefined })).toBeNull();
  });
});

describe("altura estimada e decisão", () => {
  it("70 × índice → 51,66 cm, exibido como 52 cm", () => {
    const idx = normalizeSpectralIndices({ ndvi: 0.82, evi: 0.55, savi: 0.68 })!.vegetationIndex;
    const h = estimateHeightFromVegetationIndex(idx);
    expect(h).toBeCloseTo(51.66, 2);
    expect(Math.round(h)).toBe(52);
  });

  it("faixa de 52 ± 13 cm vira 39–65 cm e provável não conformidade", () => {
    const d = evaluateHeightDecision(52, 30, 13);
    expect(Math.round(d.lowerBoundCm)).toBe(39);
    expect(Math.round(d.upperBoundCm)).toBe(65);
    expect(d.distanceToLimitCm).toBe(22);
    expect(d.status).toBe("provavelmente_nao_conforme");
    expect(d.needsFieldValidation).toBe(true);
  });

  it("classifica as três zonas de incerteza", () => {
    expect(evaluateHeightDecision(10, 30, 13).status).toBe("provavelmente_conforme");
    expect(evaluateHeightDecision(25, 30, 13).status).toBe("validar_em_campo");
    expect(evaluateHeightDecision(50, 30, 13).status).toBe("provavelmente_nao_conforme");
  });

  it("limite contratual vem da configuração central", () => {
    expect(VEGETATION_MODEL.contractualHeightLimitCm).toBe(30);
    expect(evaluateHeightDecision(52).contractualLimitCm).toBe(30);
  });
});

describe("prioridade operacional", () => {
  it("satura o risco de altura acima do limite", () => {
    const p = operationalPriority({ estimatedHeightCm: 52, ndviNormalized: 0.82, rainfall5dMm: 62, daysSinceLastMowing: 96 });
    expect(p.components.heightRisk).toBe(1);
    expect(p.score).toBeGreaterThanOrEqual(80);
    expect(p.level).toBe("critica");
  });

  it("altura zero não gera risco de altura", () => {
    const p = operationalPriority({ estimatedHeightCm: 0, ndviNormalized: 0, rainfall5dMm: 0, daysSinceLastMowing: 0 });
    expect(p.score).toBe(0);
    expect(p.level).toBe("baixa");
  });

  it("componentes ficam em 0–1 e o score em 0–100", () => {
    const p = operationalPriority({ estimatedHeightCm: 999, ndviNormalized: 9, rainfall5dMm: 999, daysSinceLastMowing: 999 });
    expect(Object.values(p.components).every(v => v >= 0 && v <= 1)).toBe(true);
    expect(p.score).toBe(100);
  });

  it("clamp protege valores fora da faixa", () => {
    expect(clamp(-2)).toBe(0);
    expect(clamp(2)).toBe(1);
  });
});

describe("dados demonstrativos", () => {
  it("gera sete cenários coerentes", () => {
    expect(DEMO_SEGMENTS).toHaveLength(7);
    for (const r of DEMO_SEGMENTS) {
      expect(r.vegetationIndex).toBeGreaterThanOrEqual(0);
      expect(r.vegetationIndex).toBeLessThanOrEqual(1);
      expect(r.upperBoundCm - r.lowerBoundCm).toBeCloseTo(2 * r.uncertaintyCm, 6);
      expect(r.dataOrigin).toBe("demonstrativo");
    }
  });

  it("o trecho de referência resulta em 52 cm e prioridade crítica", () => {
    expect(Math.round(DEMO_REFERENCE_SEGMENT.estimatedHeightCm)).toBe(52);
    expect(DEMO_REFERENCE_SEGMENT.heightDecisionStatus).toBe("provavelmente_nao_conforme");
    expect(DEMO_REFERENCE_SEGMENT.operationalPriorityLevel).toBe("critica");
  });

  it("avaliação ponta a ponta devolve índices, decisão e prioridade", () => {
    const r = evaluateSegmentModel({ ndvi: 0.82, evi: 0.55, savi: 0.68, rainfall5dMm: 62, daysSinceLastMowing: 96 })!;
    expect(Math.round(r.decision.estimatedHeightCm)).toBe(52);
    expect(r.priority.level).toBe("critica");
    expect(r.isDemonstrative).toBe(true);
  });
});
