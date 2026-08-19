/**
 * Normalização e interpretação de buscas por quilômetro.
 *
 * Aceita entradas como `3`, `3+000`, `KM 3`, `km 3+000`, `BR-448 KM 3`,
 * `12,5` e códigos de rodovia isolados. A busca por ponto quilométrico
 * passa a ser posicional (o ponto precisa estar contido no intervalo do
 * trecho), e não mais uma comparação de texto.
 */

export type KmSearchRule =
  | "km-point"        // ponto quilométrico contido no intervalo do trecho
  | "km-point-highway" // ponto quilométrico + rodovia
  | "highway"         // apenas rodovia
  | "text"            // texto livre (id, tipo, código de OS…)
  | "none";

export interface KmQuery {
  /** Consulta original. */
  raw: string;
  /** Ponto quilométrico em km decimais (ex.: 3.0 para `3+000`). */
  kmPoint: number | null;
  /** Código da rodovia detectado na consulta (ex.: `BR-448`). */
  highway: string | null;
  /** Restante da consulta, usado como texto livre. */
  text: string;
  rule: KmSearchRule;
  /** Explicação legível da regra aplicada. */
  explanation: string;
}

const HIGHWAY_RE = /\b([A-Z]{2}-\d{3}(?:-[A-Z]+)?)\b/i;
// `3+000`, `3+00`, `12+450`
const KM_PLUS_RE = /(?:^|\s|km\s*)(\d{1,4})\s*\+\s*(\d{1,3})\b/i;
// `km 3`, `km 12,5`, `km 12.5`
const KM_WORD_RE = /\bkm\s*(\d{1,4}(?:[.,]\d{1,3})?)\b/i;
// número puro
const NUMBER_RE = /^(\d{1,4}(?:[.,]\d{1,3})?)$/;

const toNumber = (v: string) => Number(v.replace(",", "."));

/** Interpreta a consulta do usuário e devolve a regra que deve ser aplicada. */
export const parseKmQuery = (raw: string): KmQuery => {
  const q = (raw ?? "").trim();
  if (!q) {
    return { raw, kmPoint: null, highway: null, text: "", rule: "none", explanation: "" };
  }

  let rest = q;

  const hw = rest.match(HIGHWAY_RE);
  const highway = hw ? hw[1].toUpperCase() : null;
  if (hw) rest = rest.replace(hw[0], " ").trim();

  let kmPoint: number | null = null;
  const plus = rest.match(KM_PLUS_RE);
  if (plus) {
    kmPoint = Number(plus[1]) + Number(plus[2].padEnd(3, "0")) / 1000;
    rest = rest.replace(plus[0], " ").trim();
  } else {
    const word = rest.match(KM_WORD_RE);
    if (word) {
      kmPoint = toNumber(word[1]);
      rest = rest.replace(word[0], " ").trim();
    } else if (NUMBER_RE.test(rest)) {
      kmPoint = toNumber(rest);
      rest = "";
    }
  }

  const text = rest.replace(/\s+/g, " ").trim();

  let rule: KmSearchRule = "text";
  if (kmPoint != null && highway) rule = "km-point-highway";
  else if (kmPoint != null) rule = "km-point";
  else if (highway && !text) rule = "highway";

  const kmLabel = kmPoint != null ? formatKmQuery(kmPoint) : "";
  const explanation =
    rule === "km-point-highway"
      ? `Trechos da ${highway} que contêm o ${kmLabel}`
      : rule === "km-point"
      ? `Trechos cujo intervalo contém o ${kmLabel}`
      : rule === "highway"
      ? `Trechos da rodovia ${highway}`
      : `Correspondência textual por "${text || q}"`;

  return { raw, kmPoint, highway, text, rule, explanation };
};

/** Formata 3 como `KM 3+000`. */
export const formatKmQuery = (km: number): string => {
  const inteiro = Math.floor(km);
  const metros = Math.round((km - inteiro) * 1000);
  if (metros === 1000) return `KM ${inteiro + 1}+000`;
  return `KM ${inteiro}+${String(metros).padStart(3, "0")}`;
};

export interface KmSearchTarget {
  kmStart: number;
  kmEnd?: number;
  rodovia?: string | null;
  /** Texto livre pesquisável (id do trecho, tipo, código de OS…). */
  text?: string;
}

/** Tolerância de 1 metro para comparação de ponto quilométrico. */
const EPS = 0.001;

/** Aplica a consulta interpretada a um alvo pesquisável. */
export const matchesKmQuery = (parsed: KmQuery, t: KmSearchTarget): boolean => {
  if (parsed.rule === "none") return true;

  if (parsed.highway) {
    const code = (t.rodovia ?? "").toUpperCase();
    if (code && code !== parsed.highway) return false;
    if (!code && parsed.rule === "highway") return false;
  }

  if (parsed.kmPoint != null) {
    const end = t.kmEnd ?? t.kmStart;
    const inRange = parsed.kmPoint >= t.kmStart - EPS && parsed.kmPoint <= end + EPS;
    if (!inRange) return false;
  }

  if (parsed.text) {
    const hay = (t.text ?? "").toLowerCase();
    if (!hay.includes(parsed.text.toLowerCase())) return false;
  }

  return true;
};
