import { describe, expect, it } from "vitest";
import { INDEX_META, evi, ndvi, pixelConfidence, savi, validateIndex } from "@/lib/spectral-indices";
import { estimateHeightCm } from "@/lib/height-model";

describe("índices espectrais", () => {
  it("NDVI mantém o resultado histórico para valores conhecidos", () => {
    expect(ndvi(0.4, 0.1)).toBeCloseTo(0.6, 6);
    expect(ndvi(0.3, 0.3)).toBe(0);
  });

  it("EVI usa B8, B4 e B2 (blue altera o resultado)", () => {
    const a = evi(0.4, 0.1, 0.05)!;
    const b = evi(0.4, 0.1, 0.2)!;
    expect(a).toBeCloseTo(2.5 * (0.3 / (0.4 + 0.6 - 0.375 + 1)), 6);
    expect(a).not.toBeCloseTo(b, 3);
  });

  it("SAVI aplica L = 0,5 por padrão e aceita parametrização", () => {
    expect(savi(0.4, 0.1)).toBeCloseTo((0.3 / 1.0) * 1.5, 6);
    expect(savi(0.4, 0.1, 1)).toBeCloseTo((0.3 / 1.5) * 2, 6);
  });

  it("trata denominadores inválidos como sem dados (nunca zero)", () => {
    expect(ndvi(0, 0)).toBeNull();
    expect(savi(0, 0, 0)).toBeNull();
    expect(ndvi(NaN, 0.2)).toBeNull();
    expect(evi(0.4, 0.1, NaN)).toBeNull();
  });

  it("valida a faixa esperada de cada índice", () => {
    expect(validateIndex("ndvi", 1.4)).toBeNull();
    expect(validateIndex("ndvi", 0.5)).toBe(0.5);
    expect(validateIndex("evi", 2.0)).toBe(2.0);
    expect(validateIndex("savi", -3)).toBeNull();
  });

  it("apenas o NDVI possui modelo de altura validado", () => {
    expect(INDEX_META.ndvi.heightModel).toBe("ndvi_linear_v1");
    expect(INDEX_META.evi.heightModel).toBeNull();
    expect(INDEX_META.savi.heightModel).toBeNull();
  });

  it("o modelo oficial de altura continua baseado em NDVI", () => {
    expect(estimateHeightCm(0.5)).toBe(32);
    expect(estimateHeightCm(0.1)).toBe(0);
  });

  it("confiança reflete a quantidade de pixels válidos", () => {
    expect(pixelConfidence(5)).toBe("baixa");
    expect(pixelConfidence(50)).toBe("media");
    expect(pixelConfidence(800)).toBe("alta");
  });
});
