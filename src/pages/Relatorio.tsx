import { TopHeader } from "@/components/vegia/TopHeader";
import { MetricCard } from "@/components/vegia/MetricCard";
import { SegmentTable } from "@/components/vegia/SegmentTable";
import { useSegments } from "@/hooks/useVegiaData";
import { Calendar, FileDown, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const Relatorio = () => {
  const { data: segments = [] } = useSegments();
  return (
  <>
    <TopHeader
      breadcrumb={[{ label: "RODOANEL SP-021", to: "/dashboard" }]}
      current="Relatório"
      showTabs
      rightSlot={
        <span className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container text-[12px] font-semibold tracking-wider uppercase text-secondary-on-container">
          <ShieldCheck className="h-3.5 w-3.5" /> Monitoramento Ativo
        </span>
      }
    />
    <div className="px-10 pb-12">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight">Relatório de conformidade</h1>
          <p className="text-muted-foreground mt-1">Período de auditoria: 01 de Abril — 30 de Abril, 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-11 px-4 rounded-lg bg-surface-high text-[13px] font-medium inline-flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Abril 2026
          </button>
          <button
            onClick={() => toast.success("Exportando PDF…", { description: "Relatório de conformidade Abril/2026" })}
            className="h-11 px-5 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold inline-flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6">
        <MetricCard label="Conformidade" value={<span>84<span className="text-[24px]">%</span></span>} footer={
          <div className="space-y-2">
            <span className="text-primary text-[12px] font-semibold">↑ 2.4%</span>
            <div className="h-1.5 rounded-full overflow-hidden flex">
              <div className="flex-[84] bg-primary" />
              <div className="flex-[16] bg-destructive" />
            </div>
          </div>
        } />
        <MetricCard label="Intervenções" value="12" unit="" footer={<span className="text-[13px] text-muted-foreground">Equipes mobilizadas em campo</span>} variant="primary" />
        <MetricCard label="Tempo Médio" value={<span>31<span className="text-[20px]">h</span></span>} footer={<span className="text-[13px] text-muted-foreground">Resposta a inconformidades</span>} />
        <div className="bg-surface-high rounded-xl p-5">
          <div className="label-md">Multas Evitadas</div>
          <div className="mt-3 text-[34px] leading-none font-bold text-foreground tracking-tight">R$ 84.000</div>
          <span className="mt-4 inline-flex px-3 py-1 rounded-full bg-secondary-container text-[11px] font-semibold tracking-wider text-secondary-on-container">ESTIMADO</span>
        </div>
      </div>

      <SegmentTable rows={segments} />

      <div className="mt-6 bg-surface-lowest rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => <div key={i} className="h-9 w-9 rounded-full bg-foreground/80 border-2 border-surface-lowest" />)}
            <div className="h-9 w-9 rounded-full bg-surface-high border-2 border-surface-lowest text-[11px] flex items-center justify-center font-semibold">+3</div>
          </div>
          <div>
            <div className="font-semibold">Auditoria Técnica Validada</div>
            <p className="text-[13px] text-muted-foreground">Este relatório foi revisado automaticamente pelos sistemas de IA e validado por 5 gestores de trecho.</p>
          </div>
        </div>
        <div className="text-right">
          <div className="label-md">Status Geral</div>
          <div className="flex items-center gap-2 mt-1 justify-end">
            <span className="font-semibold text-primary">ALTA CONFORMIDADE</span>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  </>
  );
};

export default Relatorio;
