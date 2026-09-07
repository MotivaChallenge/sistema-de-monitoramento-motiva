import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateBR } from "@/lib/utils";
import { methodologyPlainLines } from "@/lib/methodology";
import { evaluateDecision, MODEL_UNCERTAINTY_CM, HEIGHT_MODEL_ID, HEIGHT_MODEL_VERSION } from "@/lib/uncertainty";

export interface PdfReportInput {
  reportCode: string;
  rodovia: string;
  unidade?: string | null;
  dataLevantamento: string; // ISO yyyy-mm-dd
  kmStart: number;
  kmEnd: number;
  metrics: {
    conformidade: number;
    lvl1: number;
    lvl2: number;
    lvl3: number;
    totalCounted: number;
  };
  measurements: Array<{
    item_codigo: string;
    item_descricao: string;
    km_offset: number;
    nivel: number | null;
    na: boolean;
  }>;
  segments: Array<{
    km: string;
    tipo: string;
    altura: number;
    limite: number;
    status: string;
    ultimaRocada: string;
    clausula?: string;
    /** Origem do dado (rótulo já formatado). */
    origem?: string;
  }>;
  assinanteNome?: string;
  /** Metadados de captura orbital para o cabeçalho técnico. */
  fonte?: { periodo?: string; imagens?: number | null; validPixels?: number | null; atualizacao?: string };
  /** Versão dos parâmetros de cálculo (pesos IRC/limiares) usada no relatório. */
  parametrosVersao?: string;
}

const fmtBR = (iso: string) => {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return iso; }
};

const statusLabel = (s: string) =>
  s === "critico" ? "Crítico" : s === "atencao" ? "Atenção" : "Conforme";

const nivelLabel = (n: number | null, na: boolean) => {
  if (na) return "N/A";
  if (n === 1) return "N1 — Conforme";
  if (n === 2) return "N2 — Atenção";
  if (n === 3) return "N3 — Crítico";
  return "—";
};

export const generateConformityPdf = (input: PdfReportInput) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header bar (Motiva / Vegia)
  doc.setFillColor(20, 30, 48);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MOTIVA RODOVIAS · VEGIA", margin, 32);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de Conformidade — Vegetação Rodoviária", margin, 50);
  doc.setFontSize(9);
  doc.text(
    `${input.rodovia}${input.unidade ? " · " + input.unidade : ""}`,
    pageW - margin, 32, { align: "right" }
  );
  doc.text(input.reportCode, pageW - margin, 50, { align: "right" });

  // Title block
  let y = 100;
  doc.setTextColor(20, 30, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Levantamento de Campo", margin, y);
  y += 22;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Data: ${fmtBR(input.dataLevantamento)}    ·    Trecho: KM ${input.kmStart} a ${input.kmEnd}    ·    Pontos avaliados: ${input.metrics.totalCounted}`,
    margin, y
  );
  y += 24;

  // Metrics cards
  const cardW = (pageW - margin * 2 - 24) / 4;
  const cards = [
    { label: "Conformidade", value: `${input.metrics.conformidade}%`, color: [16, 122, 65] },
    { label: "Nível 1 (Conforme)", value: String(input.metrics.lvl1), color: [16, 122, 65] },
    { label: "Nível 2 (Atenção)", value: String(input.metrics.lvl2), color: [200, 140, 30] },
    { label: "Nível 3 (Crítico)", value: String(input.metrics.lvl3), color: [180, 40, 40] },
  ];
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + 8);
    doc.setFillColor(245, 246, 248);
    doc.roundedRect(x, y, cardW, 60, 6, 6, "F");
    doc.setTextColor(110, 110, 110);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(c.label.toUpperCase(), x + 12, y + 18);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.setFontSize(20);
    doc.text(c.value, x + 12, y + 46);
  });
  y += 80;

  // Measurements table
  doc.setTextColor(20, 30, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Medições de Campo (ARTESP)", margin, y);
  y += 8;

  autoTable(doc, {
    startY: y + 4,
    margin: { left: margin, right: margin },
    head: [["Item", "Descrição", "KM", "Nível"]],
    body: input.measurements.map(m => [
      m.item_codigo,
      m.item_descricao,
      String(m.km_offset),
      nivelLabel(m.nivel, m.na),
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [20, 30, 48], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 249, 251] },
  });

  // Segments table
  // @ts-expect-error autotable injects lastAutoTable
  let afterY = doc.lastAutoTable?.finalY ?? y + 20;
  if (afterY > 700) { doc.addPage(); afterY = 60; }
  afterY += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Segmentos Monitorados", margin, afterY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Alturas estimadas por satélite (Sentinel-2/GEE) + modelo ${HEIGHT_MODEL_ID} ${HEIGHT_MODEL_VERSION}, incerteza por trecho (mínimo ± ${MODEL_UNCERTAINTY_CM} cm). Pontos conformes estimados não equivalem a pontos medidos em campo.`,
    margin, afterY + 12, { maxWidth: pageW - margin * 2 }
  );
  doc.setTextColor(20, 30, 48);
  afterY += 14;

  autoTable(doc, {
    startY: afterY + 8,
    margin: { left: margin, right: margin },
    head: [["KM", "Tipo", "Altura est. (cm)", "Limite / cláusula", "Status", "Zona de decisão", "Origem", "Última roçada"]],
    body: input.segments.map(s => [
      s.km,
      s.tipo,
      `${s.altura} ± ${s.uncertaintyCm ?? MODEL_UNCERTAINTY_CM}`,
      `${s.limite} cm${s.clausula ? ` · cl. ${s.clausula}` : ""}`,
      statusLabel(s.status),
      evaluateDecision({ altura: s.altura, limite: s.limite, uncertaintyCm: s.uncertaintyCm ?? undefined }).title.split(" — ")[0],
      s.origem ?? "Estimado (satélite + modelo)",
      formatDateBR(s.ultimaRocada),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [20, 30, 48], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 249, 251] },
  });

  // Anexo técnico — Metodologia e limitações (sempre em página própria)
  doc.addPage();
  let my = 60;
  doc.setTextColor(20, 30, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Anexo técnico — Metodologia e limitações", margin, my);
  my += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  const fonteLine = [
    input.fonte?.periodo ? `Período das imagens: ${input.fonte.periodo}` : "Período das imagens: últimos 60 dias",
    input.fonte?.imagens != null ? `Cenas: ${input.fonte.imagens}` : null,
    input.fonte?.validPixels != null ? `Pixels válidos: ${input.fonte.validPixels}` : null,
    input.fonte?.atualizacao ? `Atualização dos índices: ${input.fonte.atualizacao}` : null,
    input.parametrosVersao ? `Parâmetros de cálculo: ${input.parametrosVersao}` : null,
  ].filter(Boolean).join("   ·   ");
  const fonteWrapped = doc.splitTextToSize(fonteLine, pageW - margin * 2) as string[];
  doc.text(fonteWrapped, margin, my);
  my += fonteWrapped.length * 11 + 8;

  const pageH = doc.internal.pageSize.getHeight();
  for (const sec of methodologyPlainLines()) {
    if (my > pageH - 90) { doc.addPage(); my = 60; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 30, 48);
    doc.text(sec.title, margin, my);
    my += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    for (const line of sec.lines) {
      const wrapped = doc.splitTextToSize(`• ${line}`, pageW - margin * 2 - 8) as string[];
      if (my + wrapped.length * 11 > pageH - 60) { doc.addPage(); my = 60; }
      doc.text(wrapped, margin + 6, my);
      my += wrapped.length * 11 + 3;
    }
    my += 6;
  }

  // Signature on last page
  let sigY = my + 40;
  if (sigY > 740) { doc.addPage(); sigY = 120; }
  doc.setDrawColor(120, 120, 120);
  doc.line(margin, sigY, margin + 240, sigY);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text(input.assinanteNome ?? "Responsável Técnico", margin, sigY + 14);
  doc.text("Engenharia de Conservação · Motiva Rodovias", margin, sigY + 28);

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Motiva Monitoramento · Fonte: Sentinel-2 SR Harmonized / Google Earth Engine + levantamento de campo`,
      margin, doc.internal.pageSize.getHeight() - 30
    );
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} · Apoio à decisão — não substitui medição contratual de campo`,
      margin, doc.internal.pageSize.getHeight() - 20
    );
    doc.text(
      `Página ${i}/${pageCount}`,
      pageW - margin, doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  doc.save(`vegia-${input.reportCode}.pdf`);
};