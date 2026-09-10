/**
 * Diagnóstico estatístico dos índices espectrais.
 *
 * Responde, com número, duas perguntas antes de qualquer métrica composta:
 *  - os índices medem coisas diferentes? (correlação de Pearson/Spearman)
 *  - há redundância a ponto de a combinação não acrescentar nada? (VIF e
 *    variância explicada pelo primeiro componente principal)
 */

export const mean = (v: number[]): number => (v.length ? v.reduce((a, x) => a + x, 0) / v.length : 0);

export const variance = (v: number[]): number => {
  if (v.length < 2) return 0;
  const m = mean(v);
  return v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1);
};

export const stdDev = (v: number[]): number => Math.sqrt(variance(v));

export const median = (v: number[]): number => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};

export const quantile = (v: number[], q: number): number => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const pos = (s.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
};

/** Correlação linear de Pearson; null quando alguma série é constante. */
export const pearson = (a: number[], b: number[]): number | null => {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
};

/** Postos médios (empates recebem a média dos postos). */
export const ranks = (v: number[]): number[] => {
  const idx = v.map((x, i) => ({ x, i })).sort((p, q) => p.x - q.x);
  const out = new Array<number>(v.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].x === idx[i].x) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k].i] = r;
    i = j + 1;
  }
  return out;
};

/** Correlação de postos de Spearman (monotônica, robusta a não linearidade). */
export const spearman = (a: number[], b: number[]): number | null => {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  return pearson(ranks(a.slice(0, n)), ranks(b.slice(0, n)));
};

export type Matrix = number[][];

/** Matriz de correlação (Pearson por padrão) entre colunas. */
export const correlationMatrix = (
  columns: number[][],
  method: "pearson" | "spearman" = "pearson"
): (number | null)[][] => {
  const f = method === "pearson" ? pearson : spearman;
  return columns.map((a) => columns.map((b) => (a === b ? 1 : f(a, b))));
};

/** Padroniza colunas (z-score). Colunas constantes viram zeros. */
export const zscoreColumns = (columns: number[][]): number[][] =>
  columns.map((c) => {
    const m = mean(c);
    const s = stdDev(c);
    return s === 0 ? c.map(() => 0) : c.map((x) => (x - m) / s);
  });

/** Matriz de covariância entre colunas. */
export const covarianceMatrix = (columns: number[][]): Matrix => {
  const n = columns[0]?.length ?? 0;
  const means = columns.map(mean);
  const k = columns.length;
  const out: Matrix = Array.from({ length: k }, () => new Array(k).fill(0));
  if (n < 2) return out;
  for (let i = 0; i < k; i++) {
    for (let j = i; j < k; j++) {
      let acc = 0;
      for (let t = 0; t < n; t++) acc += (columns[i][t] - means[i]) * (columns[j][t] - means[j]);
      const v = acc / (n - 1);
      out[i][j] = v; out[j][i] = v;
    }
  }
  return out;
};

/** Primeiro autovetor/autovalor por iteração de potência. */
export const powerIteration = (m: Matrix, iterations = 500): { vector: number[]; value: number } => {
  const k = m.length;
  let v = new Array(k).fill(1 / Math.sqrt(k));
  let value = 0;
  for (let it = 0; it < iterations; it++) {
    const next = m.map((row) => row.reduce((a, x, j) => a + x * v[j], 0));
    const norm = Math.sqrt(next.reduce((a, x) => a + x * x, 0));
    if (!Number.isFinite(norm) || norm === 0) break;
    const nv = next.map((x) => x / norm);
    value = norm;
    const delta = nv.reduce((a, x, i) => a + Math.abs(x - v[i]), 0);
    v = nv;
    if (delta < 1e-12) break;
  }
  // Sinal canônico: primeira carga não nula positiva.
  const first = v.find((x) => Math.abs(x) > 1e-12) ?? 1;
  if (first < 0) v = v.map((x) => -x);
  return { vector: v, value };
};

/** Fração da variância total explicada pelo primeiro componente principal. */
export const explainedVarianceFirstPC = (columns: number[][]): number => {
  const z = zscoreColumns(columns);
  const cov = covarianceMatrix(z);
  const total = cov.reduce((a, row, i) => a + row[i], 0);
  if (total <= 0) return 0;
  return Math.min(1, powerIteration(cov).value / total);
};

/** Coeficiente de determinação de uma coluna explicada pelas demais (via correlação múltipla aproximada). */
const r2Against = (target: number[], others: number[][]): number => {
  // Regressão linear múltipla por equações normais com regularização mínima.
  const n = target.length;
  const p = others.length;
  if (!n || !p) return 0;
  const X = Array.from({ length: n }, (_, t) => [1, ...others.map((c) => c[t])]);
  const k = p + 1;
  const XtX: Matrix = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (let t = 0; t < n; t++) {
    for (let i = 0; i < k; i++) {
      Xty[i] += X[t][i] * target[t];
      for (let j = 0; j < k; j++) XtX[i][j] += X[t][i] * X[t][j];
    }
  }
  for (let i = 0; i < k; i++) XtX[i][i] += 1e-9;
  const beta = solve(XtX, Xty);
  if (!beta) return 0;
  const m = mean(target);
  let ssRes = 0, ssTot = 0;
  for (let t = 0; t < n; t++) {
    const pred = X[t].reduce((a, x, i) => a + x * beta[i], 0);
    ssRes += (target[t] - pred) ** 2;
    ssTot += (target[t] - m) ** 2;
  }
  if (ssTot === 0) return 0;
  return Math.min(1, Math.max(0, 1 - ssRes / ssTot));
};

/** Eliminação de Gauss com pivotamento parcial. */
export const solve = (A: Matrix, b: number[]): number[] | null => {
  const k = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-14) return null;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let j = c; j <= k; j++) m[r][j] -= f * m[c][j];
    }
  }
  return m.map((row, i) => row[k] / row[i]);
};

/**
 * Fator de inflação de variância por coluna: VIF = 1 / (1 − R²).
 * VIF > 10 indica multicolinearidade severa (o índice é praticamente
 * reconstituível a partir dos outros — redundante na combinação).
 */
export const vif = (columns: number[][]): number[] =>
  columns.map((c, i) => {
    const others = columns.filter((_, j) => j !== i);
    const r2 = r2Against(c, others);
    return r2 >= 0.999999 ? Infinity : 1 / (1 - r2);
  });
