import { useEffect, useMemo, useState } from "react";
import { segmentProvenance } from "@/lib/data-provenance";
import { TopHeader } from "@/components/vegia/TopHeader";
import { MetricCard } from "@/components/vegia/MetricCard";
import { SegmentTable } from "@/components/vegia/SegmentTable";
import { useSegments, useInspectionReports, useInspectionMeasurements } from "@/hooks/useVegiaData";
import { FileDown, ShieldCheck, FileX } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/vegia/QueryErrorState";
import { useFilters } from "@/contexts/FiltersContext";
import { GlobalFilters } from "@/components/vegia/GlobalFilters";
import { HighwaySelect } from "@/components/vegia/HighwaySelect";
import { generateConformityPdf } from "@/lib/pdf-export";
import { useAuth } from "@/hooks/useAuth";
import { DataSourcePanel } from "@/components/vegia/DataSourcePanel";
import { DataOriginBadge } from "@/components/vegia/DataOriginBadge";
import { DecisionZoneCard } from "@/components/vegia/DecisionZone";
import { METHODOLOGY_SECTIONS } from "@/lib/methodology";
import { ORIGIN_META, POSITIONING_MESSAGE, segmentOrigin } from "@/lib/data-provenance";
import { evaluateDecision, segmentUncertainty } from "@/lib/uncertainty";
import { useSettings } from "@/hooks/useSettings";
import { settingsVersionLabel } from "@/lib/settings-version";

const Relatorio = () => {
  const { data: segmentsRaw = [], isLoading: loadingSegs, isError: errorSegs, refetch: refetchSegs } = useSegments();
  const { data: reports = [], isLoading: loadingReports, isError: errorReports, refetch: refetchReports } = useInspectionReports();
  const { matches } = useFilters();
  const { user } = useAuth();
  const { settings } = useSettings();
  const parametrosVersao = settingsVersionLabel(settings);
  const segments = useMemo(
    () => segmentsRaw.filter(s => matches({
      status: s.status, kmStart: s.kmStart, kmEnd: s.kmEnd, rodovia: s.rodovia ?? null,
      text: `${s.km} ${s.tipo} ${s.id}`, ...segmentProvenance(s),
    })),
    [segmentsRaw, matches]
  );
  const [reportId, setReportId] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!reportId && reports.length) setReportId(reports[0].id);
  }, [reports, reportId]);
  const { data: measurements = [] } = useInspectionMeasurements(reportId);

  const selectedReport = reports.find(r => r.id === reportId);
  const periodLabel = selectedReport
    ? new Date(selectedReport.data_levantamento + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  // Compute compliance metrics from real measurements (only counted ones, not N/A)
  const counted = measurements.filter(m => !m.na && m.nivel != null);
  const lvl1 = counted.filter(m => m.nivel === 1).length;
  const lvl2 = counted.filter(m => m.nivel === 2).length;
  const lvl3 = counted.filter(m => m.nivel === 3).length;
  const totalCounted = counted.length || 1;
  const conformidade = Math.round(((lvl1 + lvl2 * 0.5) / totalCounted) * 100);
  const intervencoes = lvl3;
  const conformidadeLvl1Pct = Math.round((lvl1 / totalCounted) * 100);
  const inconformidadePct = Math.max(0, 100 - conformidadeLvl1Pct);

  const handleExportPdf = () => {
    if (!selectedReport) return;
    try {
      generateConformityPdf({
        reportCode: selectedReport.report_code,
        rodovia: selectedReport.rodovia,
        unidade: selectedReport.unidade,
        dataLevantamento: selectedReport.data_levantamento,
        kmStart: Number(selectedReport.km_start),
        kmEnd: Number(selectedReport.km_end),
        metrics: { conformidade, lvl1, lvl2, lvl3, totalCounted: counted.length },
        measurements: measurements.map(m => ({
          item_codigo: m.item_codigo,
          item_descricao: m.item_descricao,
          km_offset: m.km_offset,
          nivel: m.nivel,
          na: m.na,
        })),
        segments: segments.map(s => ({
          km: s.km, tipo: s.tipo, altura: s.altura, limite: s.limite,
          status: s.status, ultimaRocada: s.ultimaRocada, clausula: s.clausula,
          origem: ORIGIN_META[segmentOrigin(s)].label,
          uncertaintyCm: segmentUncertainty(s),
        })),
        assinanteNome: user?.user_metadata?.display_name || user?.email || undefined,
        fonte: { periodo: "últimos 60 dias (composição mediana)", atualizacao: new Date().toLocaleString("pt-BR") },
        parametrosVersao,
      });
      toast.success("PDF gerado", { description: selectedReport.report_code });
    } catch (e) {
      toast.error("Falha ao gerar PDF", { description: (e as Error).message });
    }
  };
  return (
  <>
    <TopHeader
      breadcrumb={[{ label: "Rodoanel SP-021", to: "/dashboard" }]}
      current="Relatório"
      showTabs
      rightSlot={
        <>
          <HighwaySelect className="hidden md:inline-flex" />
          <GlobalFilters />
           <span className="ml-2 hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container text-[12px] font-semibold tracking-wider uppercase text-secondary-on-container">
            <ShieldCheck className="h-3.5 w-3.5" /> Monitoramento Ativo
          </span>
        </>
      }
    />
    <div className="px-4 md:px-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight">Relatório de conformidade</h1>
          <p className="text-muted-foreground mt-1">
            Levantamento de campo: {periodLabel}
            {selectedReport && <> · {selectedReport.report_code} · {selectedReport.rodovia}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <label htmlFor="report-select" className="sr-only">Selecionar relatório</label>
          <select
            id="report-select"
            value={reportId ?? ""}
            onChange={e => setReportId(Number(e.target.value))}
            disabled={!reports.length}
            className="h-11 px-4 max-w-full min-w-0 rounded-lg bg-surface-high text-[13px] font-medium outline-none border border-border disabled:opacity-50"
          >
            {reports.length === 0 && <option value="">Nenhum relatório</option>}
            {reports.map(r => (
              <option key={r.id} value={r.id}>
                {new Date(r.data_levantamento + "T00:00:00").toLocaleDateString("pt-BR")} — {r.report_code}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportPdf}
            disabled={!selectedReport}
            aria-label="Exportar relatório em PDF"
            className="h-11 px-5 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {errorSegs || errorReports ? (
        <QueryErrorState
          onRetry={() => { refetchSegs(); refetchReports(); }}
          message="Não conseguimos carregar os relatórios de conformidade."
        />
      ) : loadingReports || loadingSegs ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-surface-lowest rounded-xl p-12 text-center">
          <FileX className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-[16px] font-semibold mb-1">Nenhum relatório de campo disponível</h2>
          <p className="text-[13px] text-muted-foreground">Os levantamentos ARTESP aparecerão aqui assim que forem registrados.</p>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <MetricCard label="Conformidade" value={<span>{conformidade}<span className="text-[24px]">%</span></span>} footer={
          <div className="space-y-2">
            <span className="text-muted-foreground text-[12px] font-semibold block leading-snug">
              (Nível 1 {lvl1} + Nível 2 {lvl2} × 0,5) ÷ {counted.length} pontos avaliados
            </span>
            <span className="text-muted-foreground/80 text-[11px] block leading-snug">
              Pontos marcados como N/A não entram no cálculo. Nível 3 ({lvl3}) conta como não conforme.
            </span>
            <div className="h-1.5 rounded-full overflow-hidden flex">
              <div className="bg-primary" style={{ flex: conformidadeLvl1Pct }} />
              <div className="bg-destructive" style={{ flex: inconformidadePct }} />
            </div>
          </div>
        } />
        <MetricCard label="Pontos Críticos (h>30cm)" value={String(intervencoes)} unit="" footer={<span className="flex items-center gap-2 text-[13px] text-muted-foreground"><DataOriginBadge origin="campo" /> Nível 3 detectados em campo</span>} variant="primary" />
        <MetricCard label="Pontos em Atenção" value={String(lvl2)} unit="(10–30cm)" footer={<span className="text-[13px] text-muted-foreground">Nível 2 monitoramento</span>} />
        <div className="bg-surface-high rounded-xl p-5">
          <div className="label-md">Pontos Conformes</div>
          <div className="mt-3 text-[34px] leading-none font-bold text-foreground tracking-tight">{lvl1}</div>
          <div className="mt-4"><DataOriginBadge origin="campo" variant="full" /></div>
        </div>
      </div>

      <DataSourcePanel className="mb-6" info={{ updatedAt: new Date(), demo: false }} note="Nº de cenas e pixels válidos variam por trecho — consulte o detalhe de cada segmento para os valores calculados no Earth Engine daquele ponto." />

      <div className="mb-6 rounded-xl border border-border/60 bg-surface-low px-4 py-3 text-[12.5px] leading-relaxed">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <DataOriginBadge origin="campo" variant="full" />
          <span className="text-muted-foreground">medições ARTESP acima ·</span>
          <DataOriginBadge origin="satelite" variant="full" />
          <span className="text-muted-foreground">segmentos abaixo</span>
        </div>
        <p className="text-muted-foreground">
          Pontos <strong className="text-foreground">conformes estimados</strong> por satélite + modelo não equivalem a pontos
          <strong className="text-foreground"> medidos em campo</strong>. Quando a estimativa cruza o limite considerando a incerteza,
          o trecho é encaminhado à validação presencial antes de concluir conformidade. Parâmetros de cálculo: <span className="font-mono">{parametrosVersao}</span>.
        </p>
      </div>

      <SegmentTable rows={segments} />

      {/* Cláusula, limite e regra por segmento */}
      <section className="mt-6 bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
        <h2 className="text-[14px] font-semibold tracking-wider uppercase mb-1">Cláusula, limite e regra de classificação</h2>
        <p className="text-[12px] text-muted-foreground mb-4">
          Cada ativo tem um limite específico (30, 45 ou 60 cm). O status considera o limite da cláusula do ativo, não apenas a regra geral de 30 cm.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {segments.slice(0, 6).map(s => {
            const d = evaluateDecision({ altura: s.altura, limite: s.limite, uncertaintyCm: segmentUncertainty(s) });
            const dentro = s.altura <= s.limite;
            return (
              <div key={s.id} className="rounded-lg border border-border/50 bg-surface-low p-3 text-[12.5px] leading-relaxed">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold">{s.km} · {s.tipo}</span>
                  <DataOriginBadge origin={segmentOrigin(s)} />
                </div>
                <p>
                  Altura estimada: <strong>{s.altura} cm</strong>. Limite da cláusula {s.clausula} para este ativo: <strong>{s.limite} cm</strong>.
                  Resultado: <strong>{dentro ? "dentro" : "acima"} do limite específico da cláusula</strong>
                  {s.limite !== 30 && " — a regra geral de 30 cm não se aplica a este item"}.
                </p>
                <p className="text-muted-foreground mt-1">{d.summary}</p>
              </div>
            );
          })}
        </div>
        {segments[0] && (
          <div className="mt-4">
            <DecisionZoneCard altura={segments[0].altura} limite={segments[0].limite} uncertaintyCm={segmentUncertainty(segments[0])} origin={segmentOrigin(segments[0])} clausula={segments[0].clausula} />
          </div>
        )}
      </section>

      {/* Metodologia e limitações */}
      <section className="mt-6 bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card" id="metodologia">
        <h2 className="text-[14px] font-semibold tracking-wider uppercase mb-4">Metodologia e limitações</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {METHODOLOGY_SECTIONS.map(sec => (
            <div key={sec.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{sec.title}</h3>
              <ul className="space-y-1">
                {sec.items.map((it, i) => (
                  <li key={i} className="text-[12.5px] leading-relaxed pl-3 border-l-2 border-border">{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[12px] italic text-muted-foreground border-t border-border/50 pt-3">{POSITIONING_MESSAGE}</p>
      </section>

      <div className="mt-6 bg-surface-lowest rounded-xl p-5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => <div key={i} className="h-9 w-9 rounded-full bg-foreground/80 border-2 border-surface-lowest" />)}
            <div className="h-9 w-9 rounded-full bg-surface-high border-2 border-surface-lowest text-[11px] flex items-center justify-center font-semibold">+3</div>
          </div>
          <div>
            <div className="font-semibold">Auditoria Técnica Validada</div>
            <p className="text-[13px] text-muted-foreground">Levantamento ARTESP — {totalCounted} pontos avaliados em {selectedReport ? `${selectedReport.km_start}–${selectedReport.km_end}km` : "—"}.</p>
          </div>
        </div>
        <div className="text-right">
          <div className="label-md">Status Geral</div>
          <div className="flex items-center gap-2 mt-1 justify-end">
            <span className={`font-semibold ${conformidade >= 80 ? "text-primary" : conformidade >= 50 ? "text-tertiary" : "text-destructive"}`}>
              {conformidade >= 80 ? "ALTA CONFORMIDADE" : conformidade >= 50 ? "MODERADA" : "BAIXA"}
            </span>
            <ShieldCheck className={`h-5 w-5 ${conformidade >= 80 ? "text-primary" : conformidade >= 50 ? "text-tertiary" : "text-destructive"}`} />
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  </>
  );
};

export default Relatorio;
