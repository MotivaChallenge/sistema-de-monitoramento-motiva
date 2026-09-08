import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { estimateHeight, estimateHeightCm, MODEL_RESIDUAL_CM } from "@/lib/height-model";
import { computeIRC, daysSince } from "@/lib/irc";
import { evaluateDecision, segmentUncertainty, MODEL_UNCERTAINTY_CM } from "@/lib/uncertainty";

describe("modelo de altura", () => {
  it("aplica a reta (NDVI − 0,15) × 90 e trunca em zero", () => {
    expect(estimateHeightCm(0.15)).toBe(0);
    expect(estimateHeightCm(0.05)).toBe(0);
    expect(estimateHeightCm(0.5)).toBe(31);
  });

  it("usa SAVI e marca saturação acima de NDVI 0,80", () => {
    const r = estimateHeight({ ndviMedian: 0.86, saviMedian: 0.9 });
    expect(r.saturated).toBe(true);
    expect(r.indexUsed).toBe("savi");
  });

  it("aumenta a incerteza com dispersão espacial e idade da leitura", () => {
    const base = estimateHeight({ ndviMedian: 0.4, ndviStd: 0, validPixels: 500, ageDays: 0 });
    const pior = estimateHeight({ ndviMedian: 0.4, ndviStd: 0.2, validPixels: 30, ageDays: 20 });
    expect(base.uncertaintyCm).toBeCloseTo(MODEL_RESIDUAL_CM, 1);
    expect(pior.uncertaintyCm!).toBeGreaterThan(base.uncertaintyCm!);
  });

  it("mantém paridade com o modelo usado no processamento do satélite", () => {
    const front = readFileSync("src/lib/height-model.ts", "utf8");
    const back = readFileSync("supabase/functions/_shared/height-model.ts", "utf8");
    const consts = (src: string) =>
      ["NDVI_FLOOR", "NDVI_SATURATION", "HEIGHT_SLOPE", "MODEL_RESIDUAL_CM", "GROWTH_CM_PER_DAY"].map(
        k => src.match(new RegExp(`${k} = ([0-9.]+)`))?.[1]
      );
    expect(consts(front)).toEqual(consts(back));
  });
});

describe("incerteza por trecho", () => {
  it("usa o valor gravado na leitura e cai no resíduo base quando ausente", () => {
    expect(segmentUncertainty({ uncertaintyCm: 21.4 })).toBe(21.4);
    expect(segmentUncertainty({ uncertaintyCm: null })).toBe(MODEL_UNCERTAINTY_CM);
  });

  it("classifica a zona de decisão considerando a faixa de incerteza", () => {
    expect(evaluateDecision({ altura: 20, limite: 60, uncertaintyCm: 10 }).zone).toBe("baixo");
    expect(evaluateDecision({ altura: 58, limite: 60, uncertaintyCm: 13 }).zone).toBe("validar");
    expect(evaluateDecision({ altura: 90, limite: 60, uncertaintyCm: 13 }).zone).toBe("alto");
  });
});

describe("IRC", () => {
  it("é estável ao longo do dia (dias civis)", () => {
    const manha = new Date("2026-03-10T06:00:00Z");
    const noite = new Date("2026-03-10T23:00:00Z");
    expect(daysSince("2026-03-01", manha)).toBe(daysSince("2026-03-01", noite));
  });

  it("limita o NDVI entre piso e saturação", () => {
    const a = computeIRC({ ndvi: 0.8, altura: 40, limite: 60, ultimaRocada: "2026-01-01", rainMm5d: 0 });
    const b = computeIRC({ ndvi: 0.99, altura: 40, limite: 60, ultimaRocada: "2026-01-01", rainMm5d: 0 });
    expect(a.score).toBe(b.score);
  });

  it("redistribui o peso da chuva quando não há previsão disponível", () => {
    const args = { ndvi: 0.6, altura: 40, limite: 60, ultimaRocada: "2026-01-01" };
    const semChuva = computeIRC(args);
    const chuvaZero = computeIRC({ ...args, rainMm5d: 0 });
    expect(semChuva.score).toBeGreaterThan(chuvaZero.score);
  });
});
