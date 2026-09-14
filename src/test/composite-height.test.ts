import { describe, expect, it } from "vitest";
import {
  ACTIVE_CALIBRATION,
  CALIBRATION_POINTS,
  MAINTENANCE_THRESHOLDS,
  VEGETATION_WEIGHTS,
  areWeightsValid,
  calibrateHeightModel,
  compositeVegetationIndex,
  confidenceFromStats,
  estimateHeight,
  estimateHeightCm,
  fieldStats,
  maintenanceLevel,
  temporalQuality,
  validateCalibration,
} from "@/lib/composite-height";

const T1 = { ndvi: 0.38, evi: 0.216, savi: 0.203 };
const T2 = { ndvi: 0.458, evi: 0.413, savi: 0.32 };

describe("pesos", () => {
  it("os pesos padrão somam 1", () => {
    expect(areWeightsValid(VEGETATION_WEIGHTS)).toBe(true);
  });

  it("rejeita pesos que não somam 1 e renormaliza no cálculo", () => {
    const w = { ndvi: 0.2, evi: 0.55, savi: 0.5 };
    expect(areWeightsValid(w)).toBe(false);
    const v = compositeVegetationIndex(T1, w)!;
    expect(v).toBeCloseTo((0.2 * 0.38 + 0.55 * 0.216 + 0.5 * 0.203) / 1.25, 6);
    expect(estimateHeight(T1, { weights: w }).limitations.join(" ")).toContain("não somam 1");
  });
});

describe("índice composto", () => {
  it("Teste 1 (rotatória) ≈ 0,241", () => {
    expect(compositeVegetationIndex(T1)!).toBeCloseTo(0.241, 3);
  });

  it("Teste 2 (sítio) ≈ 0,386", () => {
    expect(compositeVegetationIndex(T2)!).toBeCloseTo(0.386, 3);
  });

  it("retorna null com índice ausente, nulo ou inválido", () => {
    expect(compositeVegetationIndex({ ndvi: 0.4, evi: null, savi: 0.3 })).toBeNull();
    expect(compositeVegetationIndex({ ndvi: 0.4, evi: undefined, savi: 0.3 })).toBeNull();
    expect(compositeVegetationIndex({ ndvi: NaN, evi: 0.2, savi: 0.3 })).toBeNull();
  });

  it("aceita zeros e valores fora da faixa esperada sem quebrar", () => {
    expect(compositeVegetationIndex({ ndvi: 0, evi: 0, savi: 0 })).toBe(0);
    expect(compositeVegetationIndex({ ndvi: -1, evi: -0.5, savi: -0.4 })).toBeLessThan(0);
    expect(compositeVegetationIndex({ ndvi: 2, evi: 2.5, savi: 1.5 })).toBeGreaterThan(1);
  });
});

describe("estimativa de altura", () => {
  it("reproduz os dois pontos de calibração", () => {
    expect(estimateHeight(T1).estimatedHeightCm!).toBeCloseTo(9, 0);
    expect(estimateHeight(T2).estimatedHeightCm!).toBeCloseTo(39.5, 0);
  });

  it("a reta ajustada bate com os coeficientes documentados", () => {
    expect(ACTIVE_CALIBRATION.a).toBeCloseTo(210.3, 0);
    expect(ACTIVE_CALIBRATION.b).toBeCloseTo(-41.7, 0);
    expect(ACTIVE_CALIBRATION.publishable).toBe(false);
  });

  it("nunca retorna altura negativa", () => {
    expect(estimateHeightCm(0)).toBe(0);
    expect(estimateHeight({ ndvi: 0.02, evi: 0.01, savi: 0.01 }).estimatedHeightCm).toBe(0);
  });

  it("sem os três índices não estima", () => {
    const r = estimateHeight({ ndvi: 0.4, evi: null, savi: 0.3 });
    expect(r.estimatedHeightCm).toBeNull();
    expect(r.steps).toHaveLength(0);
    expect(r.limitations.join(" ")).toContain("obrigatórios");
  });

  it("recalibra quando um novo ponto é adicionado", () => {
    const extra = calibrateHeightModel([
      ...CALIBRATION_POINTS,
      {
        id: "test-03",
        label: "Novo ponto",
        locationType: "urbano",
        ndvi: 0.3,
        evi: 0.15,
        savi: 0.15,
        fieldMeasurementsCm: [5],
        satelliteDate: null,
        fieldMeasurementDate: null,
      },
    ])!;
    expect(extra.nPoints).toBe(3);
    expect(extra.a).not.toBeCloseTo(ACTIVE_CALIBRATION.a, 6);
    expect(extra.r2).not.toBeNull();
  });
});

describe("heterogeneidade e confiança", () => {
  it("Teste 1: média 9, faixa 4–13, desvio ≈ 3,9", () => {
    const s = fieldStats([4, 8, 11, 13]);
    expect(s.meanCm).toBe(9);
    expect(s.minCm).toBe(4);
    expect(s.maxCm).toBe(13);
    expect(s.sdCm!).toBeCloseTo(3.9, 1);
    expect(s.heterogeneity).toBe("alta");
  });

  it("Teste 2: média 39,5, faixa 30–49, desvio ≈ 13,4", () => {
    const s = fieldStats([30, 49]);
    expect(s.meanCm).toBe(39.5);
    expect(s.sdCm!).toBeCloseTo(13.4, 1);
    expect(s.heterogeneity).toBe("alta");
    expect(confidenceFromStats(s)).toBe("baixa");
  });

  it("sem medições ou com apenas uma, a confiança é indeterminada", () => {
    expect(fieldStats([]).heterogeneity).toBe("indeterminada");
    expect(confidenceFromStats(fieldStats([]))).toBe("indeterminada");
    const one = fieldStats([22]);
    expect(one.n).toBe(1);
    expect(one.sdCm).toBeNull();
    expect(confidenceFromStats(one)).toBe("indeterminada");
  });

  it("vegetação muito baixa não gera variabilidade relativa instável", () => {
    const s = fieldStats([1, 2, 3]);
    expect(s.relativeVariation).toBeNull();
    expect(confidenceFromStats(s)).toBe("indeterminada");
  });

  it("variação pequena resulta em confiança alta", () => {
    expect(confidenceFromStats(fieldStats([40, 41, 42, 43]))).toBe("alta");
  });
});

describe("nível de manutenção", () => {
  it("respeita os limites configurados", () => {
    expect(maintenanceLevel(0)).toBe("normal");
    expect(maintenanceLevel(MAINTENANCE_THRESHOLDS.normalMax)).toBe("normal");
    expect(maintenanceLevel(11)).toBe("atencao");
    expect(maintenanceLevel(25)).toBe("atencao");
    expect(maintenanceLevel(39.5)).toBe("manutencao");
    expect(maintenanceLevel(40)).toBe("manutencao");
    expect(maintenanceLevel(41)).toBe("critico");
  });

  it("aceita limites alternativos", () => {
    expect(maintenanceLevel(12, { normalMax: 15, attentionMax: 30, maintenanceMax: 45 })).toBe("normal");
  });
});

describe("qualidade temporal", () => {
  it("calcula a diferença em dias e avisa quando é grande", () => {
    const q = temporalQuality("2026-09-10", "2026-09-14");
    expect(q.temporalDifferenceDays).toBe(4);
    expect(q.warning).toBe(true);
    expect(q.message).toContain("4 dias");
  });

  it("não avisa quando a imagem é do mesmo dia", () => {
    expect(temporalQuality("2026-09-14", "2026-09-14").warning).toBe(false);
  });

  it("sinaliza quando a data da imagem é desconhecida", () => {
    const q = temporalQuality(null, "2026-09-14");
    expect(q.temporalDifferenceDays).toBeNull();
    expect(q.warning).toBe(true);
  });
});

describe("validação dos pontos conhecidos", () => {
  const results = validateCalibration();

  it("o Teste 1 fica próximo de 9 cm e classifica como NORMAL", () => {
    const r = results.find((x) => x.id === "test-01")!;
    expect(r.vegetationIndex!).toBeCloseTo(0.241, 3);
    expect(r.realCm).toBe(9);
    expect(r.absoluteErrorCm!).toBeLessThan(1);
    expect(r.maintenance).toBe("normal");
    expect(r.note).toBeTruthy();
  });

  it("o Teste 2 fica próximo de 39,5 cm e classifica como NECESSITA MANUTENÇÃO", () => {
    const r = results.find((x) => x.id === "test-02")!;
    expect(r.vegetationIndex!).toBeCloseTo(0.386, 3);
    expect(r.realCm).toBe(39.5);
    expect(r.absoluteErrorCm!).toBeLessThan(1);
    expect(r.percentErro!).toBeLessThan(5);
    expect(r.maintenance).toBe("manutencao");
  });
});
