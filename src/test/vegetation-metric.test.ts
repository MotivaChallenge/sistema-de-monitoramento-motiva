import { describe, expect, it } from "vitest";
import {
  buildNormalizers, compositeMetric, EQUAL_WEIGHTS, fitWeightsNNLS, fitWeightsPCA,
  metricError, normalizeSample, normalizeWeights, robustNormalizer, type IndexSample,
} from "@/lib/vegetation-metric";
import { correlationMatrix, explainedVarianceFirstPC, pearson, spearman, vif } from "@/lib/vegetation-correlation";
import { ndvi as ndviFn, srvi, srviFromNdvi } from "@/lib/spectral-indices";

const seededRows = (n: number): IndexSample[] =>
  Array.from({ length: n }, (_, i) => {
    const nd = 0.1 + (0.7 * i) / (n - 1);
    return { ndvi: nd, evi: 0.9 * nd + 0.02, savi: 1.4 * nd - 0.05 };
  });

describe("normalização", () => {
  it("é invariante a mudança de escala linear positiva", () => {
    const v = [0.1, 0.2, 0.35, 0.5, 0.8, 1.2];
    const a = robustNormalizer(v);
    const b = robustNormalizer(v.map(x => 3 * x + 7));
    v.forEach((x, i) => expect(b.apply(3 * v[i] + 7)).toBeCloseTo(a.apply(x), 10));
  });

  it("mantém o resultado dentro de 0–1", () => {
    const n = robustNormalizer([0.2, 0.3, 0.4]);
    expect(n.apply(-99)).toBe(0);
    expect(n.apply(99)).toBe(1);
  });
});

describe("métrica composta", () => {
  it("com pesos iguais reproduz a média simples dos índices normalizados", () => {
    const rows = seededRows(20);
    const norm = buildNormalizers(rows);
    const z = normalizeSample(rows[5], norm);
    const m = compositeMetric(z, normalizeWeights(EQUAL_WEIGHTS))!;
    expect(m).toBeCloseTo((z.ndvi + z.evi + z.savi) / 3, 10);
  });

  it("permanece na faixa 0–1 para qualquer peso não negativo", () => {
    const rows = seededRows(15);
    const norm = buildNormalizers(rows);
    for (const r of rows) {
      const m = compositeMetric(normalizeSample(r, norm), { ndvi: 6, evi: 2, savi: 2 })!;
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
    }
  });

  it("pesos somam 1 e não são negativos em qualquer regime", () => {
    const rows = seededRows(40);
    for (const fit of [fitWeightsPCA(rows), fitWeightsNNLS(rows, rows.map(r => r.ndvi * 90))]) {
      const w = fit.weights;
      expect(w.ndvi + w.evi + w.savi).toBeCloseTo(1, 8);
      expect(Math.min(w.ndvi, w.evi, w.savi)).toBeGreaterThanOrEqual(0);
    }
  });

  it("sem medições suficientes a regressão avisa calibração pendente", () => {
    const rows = seededRows(12);
    const fit = fitWeightsNNLS(rows, rows.map(() => 40));
    expect(fit.mode).toBe("igual");
    expect(fit.warning).toMatch(/Calibração pendente/);
  });

  it("a regressão recupera o índice dominante em dado sintético", () => {
    // Alvo depende só do NDVI; EVI e SAVI viram ruído independente.
    const rows: IndexSample[] = [];
    const target: number[] = [];
    for (let i = 0; i < 60; i++) {
      const nd = 0.1 + (0.7 * i) / 59;
      const noise = Math.sin(i * 12.9898) * 0.5;
      rows.push({ ndvi: nd, evi: noise, savi: -noise });
      target.push(90 * nd);
    }
    const fit = fitWeightsNNLS(rows, target);
    expect(fit.mode).toBe("regressao");
    expect(fit.weights.ndvi).toBeGreaterThan(fit.weights.evi);
    expect(fit.weights.ndvi).toBeGreaterThan(fit.weights.savi);
  });

  it("erro da métrica cai quando ela acompanha o alvo", () => {
    const bom = metricError([0.1, 0.3, 0.5, 0.7, 0.9], [10, 30, 50, 70, 90])!;
    const ruim = metricError([0.1, 0.3, 0.5, 0.7, 0.9], [50, 10, 90, 20, 60])!;
    expect(bom.rmse).toBeLessThan(ruim.rmse);
  });
});

describe("diagnóstico de redundância", () => {
  it("detecta colinearidade quase perfeita entre índices do mesmo par de bandas", () => {
    const rows = seededRows(30);
    const cols = [rows.map(r => r.ndvi), rows.map(r => r.evi), rows.map(r => r.savi)];
    const c = correlationMatrix(cols);
    expect(c[0][1]!).toBeGreaterThan(0.99);
    expect(vif(cols).every(v => v > 10)).toBe(true);
    expect(explainedVarianceFirstPC(cols)).toBeGreaterThan(0.99);
  });

  it("Pearson e Spearman concordam em relação monotônica", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [2, 4, 6, 8, 10];
    expect(pearson(a, b)).toBeCloseTo(1, 10);
    expect(spearman(a, b)).toBeCloseTo(1, 10);
  });

  it("SRVI é função exata do NDVI (não acrescenta informação)", () => {
    const nir = 0.4, red = 0.1;
    const n = ndviFn(nir, red)!;
    expect(srvi(nir, red)).toBeCloseTo(srviFromNdvi(n)!, 8);
    const nd = [0.1, 0.2, 0.4, 0.6, 0.8];
    expect(spearman(nd, nd.map(x => srviFromNdvi(x)!))).toBeCloseTo(1, 10);
  });
});
