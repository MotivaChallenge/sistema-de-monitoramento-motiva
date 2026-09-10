import { TopHeader } from "@/components/vegia/TopHeader";
import { CVImageGrid, type CvScope } from "@/components/vegia/CVImageGrid";
import { DecisionZoneCard } from "@/components/vegia/DecisionZone";
import { segmentOrigin } from "@/lib/data-provenance";
import { segmentUncertainty } from "@/lib/uncertainty";
import { VisionAnalyzer } from "@/components/vegia/VisionAnalyzer";
import { useParams } from "react-router-dom";
import {
  useSegment, useInspectionReports, useInspectionMeasurements, useRocadaClassification,
} from "@/hooks/useVegiaData";
import { Sparkles, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

const AnaliseCV = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scope, setScope] = useState<CvScope>("segmento");
  const { data: seg, isLoading } = useSegment(id);
  const { data: reports = [] } = useInspectionReports();
  const latestReportId = reports[0]?.id;
  const { data: measurements = [] } = useInspectionMeasurements(latestReportId);
  const { data: rocada = [] } = useRocadaClassification();

  const kmStartM = seg ? Math.round(seg.kmStart * 1000) : 0;
  const kmEndM = seg ? Math.round(seg.kmEnd * 1000) : 0;

  // Measurements for this segment range
  const segMeas = useMemo(
    () => measurements.filter(m => m.km_offset >= kmStartM && m.km_offset <= kmEndM),
    [measurements, kmStartM, kmEndM]
  );
  const counted = segMeas.filter(m => !m.na && m.nivel != null);
  const lvl1 = counted.filter(m => m.nivel === 1).length;
  const lvl2 = counted.filter(m => m.nivel === 2).length;
  const lvl3 = counted.filter(m => m.nivel === 3).length;
  const score = counted.length ? Math.round(((lvl1 + lvl2 * 0.5) / counted.length) * 100) : 0;

  // Recommended equipment summary in segment range
  const equipmentBreakdown = useMemo(() => {
    if (!seg || !rocada.length) return [];
    const inRange = rocada.filter(r => {
      // approximate: keep all and rank by proximity later. We don't have km_approx, so use centroid lat/lng vs first marker — but we don't have markers here.
      return true;
    });
    const counts = new Map<string, number>();
    for (const r of inRange) counts.set(r.classe, (counts.get(r.classe) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [seg, rocada]);

  if (isLoading) return (
    <div className="p-10 space-y-4">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-3 gap-4 pt-4">
        <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
      </div>
      <Skeleton className="h-[420px] w-full" />
    </div>
  );
  if (!seg) {
    const kmGuess = id?.match(/(\d+)[-+](\d+)/);
    const rodoviaGuess = id?.match(/^([A-Z]{2}-\d{3}[A-Z-]*)/i)?.[1] ?? "não informada";
    return (
      <>
        <TopHeader breadcrumb={[{ label: "Motiva", to: "/dashboard" }]} current="Análise Visual" />
        <div className="px-4 md:px-10 pb-12 max-w-2xl">
          <h1 className="text-[26px] font-bold tracking-tight">Trecho não encontrado</h1>
          <p className="text-muted-foreground mt-2 text-[13.5px]">
            Não localizamos nenhum segmento cadastrado com o identificador recebido. Volte ao relatório
            para escolher um trecho válido ou abra o mapa operacional.
          </p>
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { t: "Rodovia", v: rodoviaGuess },
              { t: "KM", v: kmGuess ? `km ${kmGuess[1]}+${kmGuess[2]}` : "não identificado" },
              { t: "Parâmetro recebido", v: id ?? "—" },
            ].map(x => (
              <div key={x.t} className="bg-surface-lowest border border-border/40 rounded-xl p-4">
                <dt className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{x.t}</dt>
                <dd className="text-[14px] font-semibold mt-1 break-all">{x.v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => navigate("/relatorio")}
              className="h-10 px-5 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[12px] font-semibold uppercase tracking-wider"
            >
              Voltar ao relatório
            </button>
            <button
              onClick={() => navigate("/mapa")}
              className="h-10 px-5 rounded-lg border border-border hover:bg-surface-low text-[12px] font-semibold uppercase tracking-wider"
            >
              Ir para o mapa
            </button>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <TopHeader
        breadcrumb={[{ label: seg.rodovia ?? "Rodoanel SP-021", to: "/mapa" }]}
        current="Análise Visual"
        showTabs
        rightSlot={
          <span className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container text-[12px] font-semibold tracking-wider uppercase text-secondary-on-container">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--on-secondary-container))]" /> Monitoramento Ativo
          </span>
        }
      />
      <div className="px-10 pb-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-[30px] font-bold tracking-tight text-primary">Análise visual · {kmLabel(seg.km)} · km {seg.kmStart}–{seg.kmEnd}</h1>
            <p className="label-md mt-2">Processamento de visão computacional em tempo real</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="label-md">Engine:</span>
            <span className="font-mono text-[12px] px-3 py-1.5 rounded-md bg-secondary-container text-secondary-on-container">YOLOv8 · modelo v2.1</span>
          </div>
        </div>

        <section aria-labelledby="deteccoes-visuais">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 id="deteccoes-visuais" className="text-[15px] font-semibold tracking-wider uppercase">
                Detecções visuais
              </h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                {scope === "segmento"
                  ? `Somente capturas vinculadas ao trecho ${seg.km} (KM ${seg.kmStart}–${seg.kmEnd}).`
                  : scope === "rodovia"
                  ? `Capturas de toda a ${seg.rodovia ?? "rodovia"}.`
                  : "Capturas de toda a malha monitorada."}
              </p>
            </div>
            <div role="tablist" aria-label="Escopo das detecções" className="inline-flex rounded-lg border border-border p-0.5 bg-surface-lowest">
              {([
                { key: "segmento", label: "Este trecho" },
                { key: "rodovia", label: "Rodovia" },
                { key: "malha", label: "Malha" },
              ] as { key: CvScope; label: string }[]).map(t => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={scope === t.key}
                  onClick={() => setScope(t.key)}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-smooth ${
                    scope === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-low"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-5">
            <DecisionZoneCard altura={seg.altura} limite={seg.limite} uncertaintyCm={segmentUncertainty(seg)} origin={segmentOrigin(seg)} clausula={seg.clausula} />
          </div>
          <CVImageGrid
            scope={scope}
            segmentId={seg.id}
            rodovia={seg.rodovia ?? null}
            kmStart={seg.kmStart}
            kmEnd={seg.kmEnd}
          />
        </section>

        <div className="mt-10">
          <VisionAnalyzer context={`Trecho ${seg.km}, KM ${seg.kmStart}–${seg.kmEnd}, tipo ${seg.tipo}.`} />
        </div>

        {/* Real inspection measurements for this segment */}
        {segMeas.length > 0 && (
          <section className="mt-10 bg-surface-lowest rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold tracking-wider uppercase">Medições ARTESP do trecho</h2>
              <span className="label-md">{counted.length} pontos avaliados · {segMeas.length - counted.length} N/A</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="label-md text-primary">Nível 1 · h&lt;10cm</div>
                <div className="text-[28px] font-bold text-primary tabular-nums">{lvl1}</div>
              </div>
              <div className="bg-tertiary/10 rounded-lg p-4">
                <div className="label-md text-tertiary">Nível 2 · 10–30cm</div>
                <div className="text-[28px] font-bold text-tertiary tabular-nums">{lvl2}</div>
              </div>
              <div className="bg-destructive/10 rounded-lg p-4">
                <div className="label-md text-destructive">Nível 3 · h&gt;30cm</div>
                <div className="text-[28px] font-bold text-destructive tabular-nums">{lvl3}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 font-medium">Item</th>
                    <th className="text-left py-2 font-medium">Descrição</th>
                    <th className="text-right py-2 font-medium">KM offset</th>
                    <th className="text-right py-2 font-medium">Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {segMeas.slice(0, 30).map(m => (
                    <tr key={m.id} className="border-b border-border/20">
                      <td className="py-2 font-mono">{m.item_codigo}</td>
                      <td className="py-2 text-muted-foreground">{m.item_descricao}</td>
                      <td className="py-2 text-right tabular-nums">{m.km_offset}</td>
                      <td className="py-2 text-right">
                        {m.na ? (
                          <span className="text-muted-foreground text-[12px]">N/A</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[12px] font-semibold ${
                            m.nivel === 3 ? "bg-destructive/15 text-destructive"
                            : m.nivel === 2 ? "bg-tertiary/15 text-tertiary"
                            : "bg-primary/15 text-primary"
                          }`}>
                            {m.nivel}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {segMeas.length > 30 && (
                <p className="text-[12px] text-muted-foreground mt-3">+{segMeas.length - 30} medições adicionais.</p>
              )}
            </div>
          </section>
        )}

        <section className="mt-10 bg-surface-lowest rounded-xl p-6 relative overflow-hidden">
          <div className="absolute left-0 top-6 bottom-6 w-1 bg-primary rounded-r" />
          <div className="grid grid-cols-[1fr_1fr] gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold">Diagnóstico AI Consolidado</h2>
                  <span className="inline-flex mt-1 px-3 py-1 rounded-full bg-secondary-container text-[11px] font-semibold tracking-wider text-secondary-on-container">ANÁLISE CRÍTICA</span>
                </div>
              </div>
              <p className="text-[14px] leading-relaxed text-foreground/85">
                O trecho {seg.km} apresenta estado geral <b>{score >= 80 ? "Satisfatório" : score >= 50 ? "em Atenção" : "Crítico"} ({score}%)</b>{" "}
                com base em {counted.length} pontos de medição ARTESP. Nível 3 detectado em {lvl3} ponto(s),
                Nível 2 em {lvl2} e Nível 1 em {lvl1}.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="px-3 py-1.5 rounded-full bg-primary/15 text-primary text-[12px] font-medium">Conformes: {lvl1}</span>
                <span className="px-3 py-1.5 rounded-full bg-tertiary/15 text-tertiary text-[12px] font-medium">Atenção: {lvl2}</span>
                <span className="px-3 py-1.5 rounded-full bg-destructive/15 text-destructive text-[12px] font-medium">Críticos: {lvl3}</span>
              </div>
            </div>
            <div className="bg-surface-low rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-primary">
                <Wrench className="h-4 w-4" />
                <span className="label-md text-primary">Recomendação Operacional Técnica</span>
              </div>
              <ul className="space-y-3 text-[13.5px] leading-relaxed">
                {lvl3 > 0 && (
                  <li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" /> Mobilizar equipe de roçada imediata para os {lvl3} ponto(s) Nível 3 (vegetação acima de 30cm).</li>
                )}
                {lvl2 > 0 && (
                  <li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-tertiary shrink-0" /> Programar inspeção de acompanhamento nos {lvl2} ponto(s) Nível 2.</li>
                )}
                {equipmentBreakdown.length > 0 && (
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    Equipamentos predominantes na malha: {equipmentBreakdown.map(([c, n]) => `${c} (${n})`).join(" · ")}.
                  </li>
                )}
                <li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> Manter cadência de captura Sentinel-2 a cada 5 dias para acompanhar tendência de NDVI.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AnaliseCV;
