import type { Segment } from "@/types/domain";
import { ORIGIN_META, segmentOrigin } from "@/lib/data-provenance";
import { evaluateDecision, segmentUncertainty, HEIGHT_MODEL_ID, HEIGHT_MODEL_VERSION } from "@/lib/uncertainty";
import { kmLabel } from "@/lib/km-format";

const ZONE_LABEL: Record<string, string> = {
  baixo: "provavelmente conforme",
  validar: "zona de incerteza - validar em campo",
  alto: "provavelmente nao conforme",
  nao_calibrado: "incerteza nao calibrada",
};

export interface ExportContext {
  /** Recorte ativo (rodovia, faixa de km, filtros). */
  recorte: string;
  periodo: string;
  fonte: string;
  /** Identificador da execução da exportação. */
  execucaoId: string;
  /** Chuva acumulada em 5 dias (mm) usada na prioridade operacional. */
  chuva5dMm?: number;
}


/** Identificador legível e único da execução da exportação. */
export const newExecutionId = (): string =>
  `EXEC-${new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const esc = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * CSV do relatório com procedência completa: recorte, execução, fonte,
 * origem do dado, incerteza e status de decisão por trecho.
 */
export const segmentsToCsv = (segments: Segment[], ctx: ExportContext): string => {
  const header = [
    "data_execucao", "execucao_id", "recorte", "periodo", "fonte", "modelo", "versao_modelo",
    "segmento_id", "km", "tipo", "rodovia", "origem", "cenas_validas", "pixels_validos",
    "ndvi", "altura_estimada_cm", "incerteza_cm", "faixa_min_cm", "faixa_max_cm",
    "limite_cm", "clausula", "status_decisao", "necessita_validacao_campo",
    "prioridade_operacional_0_100", "nivel_prioridade", "versao_modelo_demonstrativo", "aviso_estimativa",
  ];
  const agora = new Date().toISOString();
  const chuva = ctx.chuva5dMm ?? 0;

  const lines = segments.map(s => {
    const u = segmentUncertainty(s);
    const d = evaluateDecision({ altura: s.altura, limite: s.limite, uncertaintyCm: u });
    const p = segmentPriority(s, chuva);
    return [
      agora, ctx.execucaoId, ctx.recorte, ctx.periodo, ctx.fonte, HEIGHT_MODEL_ID, HEIGHT_MODEL_VERSION,
      s.id, kmLabel(s.km), s.tipo, s.rodovia ?? "", ORIGIN_META[segmentOrigin(s)].label,
      s.satelliteImages ?? "nao calculado", s.satelliteValidPixels ?? "nao calculado",
      s.ndvi, s.altura, d.uncertaintyCm ?? "nao calibrada",
      d.lower != null ? Math.round(d.lower) : "nao calculado",
      d.upper != null ? Math.round(d.upper) : "nao calculado",
      s.limite, s.clausula, ZONE_LABEL[d.zone], d.needsFieldValidation ? "sim" : "nao",
      p.score, PRIORITY_LEVEL_LABEL[p.level], VEGETATION_MODEL.modelVersion, SATELLITE_NOT_A_RULER_TEXT,
    ].map(esc).join(";");
  });

  return [header.join(";"), ...lines].join("\n");
};


export const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
