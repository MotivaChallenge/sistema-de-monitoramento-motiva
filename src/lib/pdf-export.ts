import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  }>;
  assinanteNome?: string;
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

  autoTable(doc, {
    startY: afterY + 8,
    margin: { left: margin, right: margin },
    head: [["KM", "Tipo", "Altura (cm)", "Limite", "Status", "Última roçada"]],
    body: input.segments.map(s => [
      s.km,
      s.tipo,
      String(s.altura),
      String(s.limite),
      statusLabel(s.status),
      formatDateBR(s.ultimaRocada),
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [20, 30, 48], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 249, 251] },
  });

  // Signature on last page
  // @ts-expect-error autotable injects lastAutoTable
  let sigY = (doc.lastAutoTable?.finalY ?? afterY) + 60;
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
      `Vegia · Gerado em ${new Date().toLocaleString("pt-BR")}`,
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