import { describe, it, expect } from "vitest";
import {
  buildPairs, calibrate, fitLinear, effectiveIndex, predictHeightCm,
  MIN_CALIBRATION_PAIRS, type CalibrationPair,
} from "@/lib/calibration";

const pair = (index: number, heightCm: number): CalibrationPair =>
  ({ segmentId: "s", index, heightCm, lagDays: 0, indexUsed: "ndvi" });

describe("calibration", () => {
  it("pareia apenas leituras dentro da janela de dias", () => {
    const pairs = buildPairs(
      [
        { segment_id: "a", measured_at: "2026-03-10", altura_cm: 40 },
        { segment_id: "a", measured_at: "2026-05-01", altura_cm: 50 },
      ],
      [
        { segment_id: "a", read_at: "2026-03-08", ndvi_median: 0.6 },
        { segment_id: "a", read_at: "2026-03-12", ndvi_median: 0.62 },
      ],
      7,
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].index).toBeCloseTo(0.6, 5); // leitura mais próxima (2 dias)
  });

  it("usa SAVI quando a leitura está saturada", () => {
    expect(effectiveIndex({ segment_id: "a", read_at: "x", ndvi_median: 0.9, savi_median: 0.95 }))
      .toEqual({ value: 0.95, used: "savi" });
    expect(effectiveIndex({ segment_id: "a", read_at: "x", ndvi_median: 0.5, savi_median: 0.95 })?.used)
      .toBe("ndvi");
  });

  it("recupera exatamente uma relação linear sem ruído", () => {
    const pairs = [0.2, 0.3, 0.4, 0.5, 0.6].map(i => pair(i, 90 * (i - 0.15)));
    const fit = fitLinear(pairs)!;
    expect(fit.slope).toBeCloseTo(90, 6);
    expect(fit.intercept).toBeCloseTo(-13.5, 6);
    expect(fit.r2).toBeCloseTo(1, 6);
  });

  it("com dados perfeitos a incerteza medida vai a zero — não fica presa em 13 cm", () => {
    const pairs = Array.from({ length: 15 }, (_, k) => pair(0.2 + k * 0.03, 90 * (0.2 + k * 0.03 - 0.15)));
    const r = calibrate(pairs)!;
    expect(r.publishable).toBe(true);
    expect(r.uncertaintyCm).toBeLessThan(1);
    expect(r.loocvRmseCm).toBeLessThan(1);
  });

  it("marca como não publicável abaixo do mínimo de pares", () => {
    const pairs = Array.from({ length: MIN_CALIBRATION_PAIRS - 1 }, (_, k) => pair(0.2 + k * 0.03, 20 + k));
    expect(calibrate(pairs)!.publishable).toBe(false);
  });

  it("LOOCV é mais conservador que o RMSE do próprio ajuste", () => {
    const pairs = Array.from({ length: 14 }, (_, k) => {
      const i = 0.2 + k * 0.03;
      return pair(i, 90 * (i - 0.15) + (k % 2 === 0 ? 6 : -6));
    });
    const r = calibrate(pairs)!;
    expect(r.loocvRmseCm).toBeGreaterThan(r.rmseCm);
    expect(r.biasCm).toBeCloseTo(0, 1);
  });

  it("previsão nunca retorna altura negativa", () => {
    expect(predictHeightCm(0.05, 90, -13.5)).toBe(0);
    expect(predictHeightCm(0.5, 90, -13.5)).toBe(32);
  });
});
