import { TopHeader } from "@/components/vegia/TopHeader";
import { useApiHealth, ApiHealthCheck } from "@/hooks/useApiHealth";
import { useOpenMeteo } from "@/hooks/useOpenMeteo";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CloudRain, Satellite, Map as MapIcon, Database, Brain, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Plug } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from "recharts";

const categoryIcon: Record<ApiHealthCheck["category"], JSX.Element> = {
  clima: <CloudRain className="h-4 w-4" />,
  satelite: <Satellite className="h-4 w-4" />,
  geo: <MapIcon className="h-4 w-4" />,
  infra: <Database className="h-4 w-4" />,
  ia: <Brain className="h-4 w-4" />,
};

const statusStyle = {
  online: { dot: "bg-turquoise", text: "text-turquoise", label: "Online", Icon: CheckCircle2 },
  degraded: { dot: "bg-amber-500", text: "text-amber-500", label: "Degradado", Icon: AlertTriangle },
  offline: { dot: "bg-destructive", text: "text-destructive", label: "Offline", Icon: XCircle },
} as const;

const futureIntegrations = [
  { name: "Sensores IoT em campo", desc: "Sensores de umidade e temperatura nas margens da rodovia." },
  { name: "Drones de inspeção", desc: "Captura aérea automatizada e classificação por visão computacional." },
  { name: "Imagens de satélite Sentinel-2", desc: "NDVI multi-temporal em escala continental." },
  { name: "Sistemas internos Motiva", desc: "ERP, ordens de serviço e folha das equipes de campo." },
  { name: "Dados públicos ANTT", desc: "Fluxo estimado, histórico de acidentes e regiões sensíveis." },
];

const Integracoes = () => {
  const { data, isLoading, isFetching, refetch, error } = useApiHealth();
  const { data: meteo } = useOpenMeteo(16);
  const qc = useQueryClient();

  return (
    <>
      <TopHeader />
      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" /> Integrações & APIs
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-[720px]">
              Monitoramento em tempo real das fontes externas que alimentam o motor de criticidade, o módulo preditivo e o planejamento operacional do ORION.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ["open-meteo"] }); }}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Re-sincronizar
          </Button>
        </header>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {[
            { label: "Integrações", value: data?.summary.total ?? "—", color: "text-foreground" },
            { label: "Online", value: data?.summary.online ?? "—", color: "text-turquoise" },
            { label: "Degradadas", value: data?.summary.degraded ?? "—", color: "text-amber-500" },
            { label: "Offline", value: data?.summary.offline ?? "—", color: "text-destructive" },
          ].map(s => (
            <div key={s.label} className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</div>
              <div className={`text-[28px] font-bold tabular-nums mt-2 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Painel saúde APIs */}
        <section className="bg-surface-lowest rounded-xl p-4 md:p-6 border border-border/40 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14px] font-semibold tracking-wide uppercase flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Saúde das APIs
            </h2>
            {data && (
              <span className="text-[11px] text-muted-foreground">
                Última sincronização: {new Date(data.summary.generatedAt).toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : error ? (
            <div className="text-[13px] text-destructive py-6">Falha ao verificar integrações: {(error as Error).message}</div>
          ) : (
            <div className="divide-y divide-border/40">
              {data?.checks.map(c => {
                const s = statusStyle[c.status];
                return (
                  <div key={c.id} className="py-3 flex items-center gap-4">
                    <div className="h-9 w-9 rounded-lg bg-surface-high text-muted-foreground flex items-center justify-center">
                      {categoryIcon[c.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{c.category} · {c.detail ?? "operando normalmente"}</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-[13px] tabular-nums">{c.latencyMs != null ? `${c.latencyMs} ms` : "—"}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">latência</div>
                    </div>
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-high ${s.text}`}>
                      <span className={`h-2 w-2 rounded-full ${s.dot} ${c.status === "online" ? "animate-pulse" : ""}`} />
                      <span className="text-[11px] font-semibold">{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Open-Meteo data preview */}
        <section className="bg-surface-lowest rounded-xl p-4 md:p-6 border border-border/40 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-[14px] font-semibold tracking-wide uppercase flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-primary" /> Open-Meteo · Previsão estendida (16 dias)
              </h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                Insumo direto do motor preditivo — chuva, temperatura e radiação solar projetam o crescimento da vegetação.
              </p>
            </div>
            {meteo && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-3 py-1.5 rounded-full bg-surface-high text-muted-foreground">Chuva acumulada: <b className="text-foreground">{meteo.summary.totalRainMm} mm</b></span>
                <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold">Crescimento previsto: {meteo.summary.estimatedGrowthCm} cm</span>
              </div>
            )}
          </div>
          {!meteo ? <Skeleton className="h-64 w-full" /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={meteo.forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="l" tick={{ fontSize: 10 }} stroke="hsl(var(--primary))" />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--destructive))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--surface-lowest))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="l" type="monotone" dataKey="tempAvg" name="Temp. média (°C)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line yAxisId="r" type="monotone" dataKey="growthCmPerDay" name="Crescimento (cm/dia)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={meteo.forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--surface-lowest))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="rainMm" name="Chuva (mm)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Arquitetura de dados */}
        <section className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
          <h2 className="text-[14px] font-semibold tracking-wide uppercase mb-4">Fluxo de dados</h2>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            {["APIs Externas", "Coletor", "PostgreSQL", "Motor de Criticidade", "Motor Preditivo", "Planejamento", "Dashboard"].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-lg bg-surface-high border border-border/40 font-medium">{step}</div>
                {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Integrações futuras */}
        <section className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
          <h2 className="text-[14px] font-semibold tracking-wide uppercase mb-4">Roadmap de integrações</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {futureIntegrations.map(f => (
              <div key={f.name} className="p-4 rounded-lg border border-dashed border-border/60 bg-surface-low">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[13px] font-semibold">{f.name}</div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface-high px-2 py-0.5 rounded-full">Planejado</span>
                </div>
                <div className="text-[12px] text-muted-foreground leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default Integracoes;