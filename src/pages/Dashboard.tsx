import { TopHeader } from "@/components/vegia/TopHeader";
import { MetricCard } from "@/components/vegia/MetricCard";
import { NDVIHeatmapBar } from "@/components/vegia/NDVIHeatmapBar";
import { NDVIBarChart } from "@/components/vegia/NDVIBarChart";
import { AlertCard } from "@/components/vegia/AlertCard";
import { useSegments } from "@/hooks/useVegiaData";
import { RefreshCw } from "lucide-react";

const Dashboard = () => {
  const { data: segments = [], isLoading } = useSegments();
  const alerts = segments.filter(s => s.status !== "conforme").slice(0, 3);
  return (
    <>
      <TopHeader
        showStatusBadges
        showLastReading
        rightSlot={
          <button className="ml-2 inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[12px] font-semibold tracking-wider uppercase">
            <RefreshCw className="h-4 w-4" /> Atualizar Dados
          </button>
        }
      />
      <div className="px-10 pb-12 space-y-6">
        <div className="grid grid-cols-4 gap-5">
          <MetricCard label="Cobertura Total" value="29,3" unit="km" footer={<div className="h-1.5 rounded-full bg-surface-high"><div className="h-full w-1/2 rounded-full bg-primary" /></div>} />
          <MetricCard label="Trechos Críticos" value="3" unit="segmentos" variant="danger" footer={<div className="h-1.5 rounded-full bg-surface-high"><div className="h-full w-[12%] rounded-full bg-destructive" /></div>} />
          <MetricCard label="NDVI Médio" value="0,54" unit="global" footer={
            <div className="flex h-1.5 gap-0.5 rounded-full overflow-hidden">
              <div className="flex-1 bg-destructive/30" /><div className="flex-1 bg-tertiary/40" /><div className="flex-[2] bg-primary" />
            </div>
          } />
          <MetricCard label="Conformidade ARTESP" value="84" unit="%" footer={
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container text-[11px] font-semibold tracking-wider text-secondary-on-container">ALTA CONFORMIDADE</span>
          } />
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <section className="bg-surface-lowest rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold tracking-wide uppercase">Rodoanel SP-021 — Mapa NDVI em Tempo Real</h3>
                <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Saudável</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-tertiary" /> Atenção</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Crítico</span>
                </div>
              </div>
              <div className="rounded-lg bg-surface-low p-8 pb-6 min-h-[340px] flex items-end relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-[0.18]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 30%, hsl(var(--primary)/.4), transparent 40%), radial-gradient(circle at 70% 60%, hsl(var(--tertiary)/.3), transparent 45%), repeating-linear-gradient(0deg, transparent 0 24px, hsl(var(--border)) 24px 25px), repeating-linear-gradient(90deg, transparent 0 24px, hsl(var(--border)) 24px 25px)",
                  }}
                />
                <div className="relative w-full">
                  <NDVIHeatmapBar />
                </div>
              </div>
            </section>

            <section className="bg-surface-lowest rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold tracking-wide uppercase">Tendência NDVI (últimas 6 leituras)</h3>
                <span className="text-[12px] text-muted-foreground bg-surface-high px-3 py-1.5 rounded-full">Período: Junho – Agosto 2024</span>
              </div>
              <NDVIBarChart />
            </section>
          </div>

          <aside className="bg-surface-lowest rounded-xl p-5 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold tracking-wider uppercase">Alertas Ativos</h3>
              <span className="text-[11px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">10 total</span>
            </div>
            <div className="space-y-3">
              {isLoading && <div className="text-[12px] text-muted-foreground">Carregando alertas…</div>}
              {alerts.map(a => <AlertCard key={a.id} alert={a} />)}
            </div>
            <button className="w-full mt-4 py-3 rounded-lg border border-border text-[12px] font-semibold tracking-wider uppercase text-foreground hover:bg-surface-low">
              Ver todos os alertas
            </button>
          </aside>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
