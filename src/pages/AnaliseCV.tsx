import { TopHeader } from "@/components/vegia/TopHeader";
import { CVImageGrid } from "@/components/vegia/CVImageGrid";
import { useParams } from "react-router-dom";
import { useSegment } from "@/hooks/useVegiaData";
import { Sparkles, Wrench } from "lucide-react";

const AnaliseCV = () => {
  const { id } = useParams();
  const { data: seg, isLoading } = useSegment(id);
  if (isLoading) return <div className="p-10 text-muted-foreground text-sm">Carregando…</div>;
  if (!seg) return <div className="p-10 text-muted-foreground text-sm">Segmento não encontrado.</div>;
  return (
    <>
      <TopHeader
        breadcrumb={[{ label: "RODOANEL SP-021", to: "/dashboard" }]}
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
            <h1 className="text-[30px] font-bold tracking-tight text-primary">Análise visual · {seg.km} ao 7+200 · 6 imagens</h1>
            <p className="label-md mt-2">Processamento de visão computacional em tempo real</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="label-md">Engine:</span>
            <span className="font-mono text-[12px] px-3 py-1.5 rounded-md bg-secondary-container text-secondary-on-container">YOLOv8 · modelo v2.1</span>
          </div>
        </div>

        <CVImageGrid />

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
                O trecho entre os KM 5+800 e 7+200 apresenta um estado geral de conservação <b>Satisfatório (82%)</b>.
                Contudo, o modelo identificou dois pontos de atenção imediata que podem comprometer a segurança viária se não forem mitigados em curto prazo.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="px-3 py-1.5 rounded-full bg-surface-high text-[12px]">Vegetação: Estável</span>
                <span className="px-3 py-1.5 rounded-full bg-destructive/15 text-destructive text-[12px] font-medium">Pavimento: Alerta (KM 6+400)</span>
                <span className="px-3 py-1.5 rounded-full bg-tertiary/15 text-tertiary text-[12px] font-medium">Talude: Monitoramento</span>
              </div>
            </div>
            <div className="bg-surface-low rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-primary">
                <Wrench className="h-4 w-4" />
                <span className="label-md text-primary">Recomendação Operacional Técnica</span>
              </div>
              <ul className="space-y-3 text-[13.5px] leading-relaxed">
                <li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> Mobilizar equipe de conservação para correção asfáltica pontual no KM 6+400 (buraco detectado).</li>
                <li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> Programar vistoria de geotecnia para o KM 6+950 para avaliar profundidade da erosão no talude.</li>
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
