import { TopHeader } from "@/components/vegia/TopHeader";
import { useState, useMemo } from "react";
import { DollarSign, TrendingDown, Truck, ClipboardCheck, Gauge } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from "recharts";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const ROI = () => {
  const [kmMonitorados, setKmMonitorados] = useState(180);
  const [custoKmMes, setCustoKmMes] = useState(4200); // BRL/km/mês modelo tradicional
  const [reducaoEsperada, setReducaoEsperada] = useState(28); // %

  const tradicionalAno = useMemo(() => kmMonitorados * custoKmMes * 12, [kmMonitorados, custoKmMes]);
  const orionAno = useMemo(() => Math.round(tradicionalAno * (1 - reducaoEsperada / 100)), [tradicionalAno, reducaoEsperada]);
  const economia = tradicionalAno - orionAno;

  const deslocReducao = Math.round(reducaoEsperada * 1.1); // %
  const inspecaoReducao = Math.round(reducaoEsperada * 1.3);
  const eficiencia = Math.round(72 + reducaoEsperada * 0.5);

  const compare = [
    { categoria: "Roçada programada", tradicional: tradicionalAno * 0.55, orion: orionAno * 0.42 },
    { categoria: "Deslocamento equipes", tradicional: tradicionalAno * 0.18, orion: orionAno * 0.10 },
    { categoria: "Inspeção presencial", tradicional: tradicionalAno * 0.15, orion: orionAno * 0.06 },
    { categoria: "Multas / não-conformidade", tradicional: tradicionalAno * 0.08, orion: orionAno * 0.02 },
    { categoria: "Plataforma + dados", tradicional: 0, orion: 240_000 },
  ].map(r => ({ ...r, tradicional: Math.round(r.tradicional), orion: Math.round(r.orion) }));

  const projecao3y = Array.from({ length: 36 }, (_, m) => ({
    mes: m + 1,
    tradicional: Math.round(tradicionalAno / 12 * (m + 1)),
    orion: Math.round(orionAno / 12 * (m + 1)),
  }));

  return (
    <>
      <TopHeader />
      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-6">
        <header>
          <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Simulador Financeiro · ROI
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-[640px]">
            Compare o modelo tradicional (calendário fixo) com o modelo ORION (decisão por
            dados) e projete economia, redução de deslocamentos e ganho de eficiência.
          </p>
        </header>

        <section className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card grid md:grid-cols-3 gap-5">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">KM monitorados</span>
            <input type="range" min={20} max={600} value={kmMonitorados} onChange={e => setKmMonitorados(+e.target.value)} className="w-full mt-2 accent-primary" />
            <div className="text-[18px] font-bold tabular-nums mt-1">{kmMonitorados} km</div>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Custo tradicional (R$/km·mês)</span>
            <input type="range" min={1500} max={9000} step={100} value={custoKmMes} onChange={e => setCustoKmMes(+e.target.value)} className="w-full mt-2 accent-primary" />
            <div className="text-[18px] font-bold tabular-nums mt-1">{fmtBRL(custoKmMes)}</div>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Redução esperada com ORION</span>
            <input type="range" min={10} max={45} value={reducaoEsperada} onChange={e => setReducaoEsperada(+e.target.value)} className="w-full mt-2 accent-primary" />
            <div className="text-[18px] font-bold tabular-nums mt-1">{reducaoEsperada}%</div>
          </label>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Custo anual tradicional</div>
            <div className="text-[24px] font-bold tabular-nums mt-2">{fmtBRL(tradicionalAno)}</div>
          </div>
          <div className="bg-gradient-primary text-primary-foreground rounded-xl p-5 shadow-glow">
            <div className="text-[11px] uppercase tracking-wider opacity-80 font-semibold">Custo anual ORION</div>
            <div className="text-[24px] font-bold tabular-nums mt-2">{fmtBRL(orionAno)}</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-turquoise/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-turquoise" /> Economia/ano
            </div>
            <div className="text-[24px] font-bold tabular-nums mt-2 text-turquoise">{fmtBRL(economia)}</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-primary-glow" /> Eficiência operacional
            </div>
            <div className="text-[24px] font-bold tabular-nums mt-2">{eficiencia}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-secondary-container/40 border border-secondary-container rounded-xl p-4 flex items-start gap-3">
            <Truck className="h-5 w-5 text-secondary-on-container mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold text-secondary-on-container">–{deslocReducao}% deslocamentos</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Equipes roteirizadas por criticidade real, não por calendário.</div>
            </div>
          </div>
          <div className="bg-secondary-container/40 border border-secondary-container rounded-xl p-4 flex items-start gap-3">
            <ClipboardCheck className="h-5 w-5 text-secondary-on-container mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold text-secondary-on-container">–{inspecaoReducao}% inspeções presenciais</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Auditoria automática via NDVI Sentinel-2 e CV.</div>
            </div>
          </div>
          <div className="bg-secondary-container/40 border border-secondary-container rounded-xl p-4 flex items-start gap-3">
            <Gauge className="h-5 w-5 text-secondary-on-container mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold text-secondary-on-container">{eficiencia}% de eficiência operacional</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Capacidade alocada onde gera mais valor — IRC ≥ 55.</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <h2 className="text-[14px] font-semibold tracking-wide uppercase mb-4">Composição de custo anual</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={compare} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="categoria" type="category" width={140} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--surface-lowest))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tradicional" name="Tradicional" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="orion" name="ORION" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <h2 className="text-[14px] font-semibold tracking-wide uppercase mb-4">Projeção acumulada 3 anos</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={projecao3y}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tickFormatter={v => `${v}m`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--surface-lowest))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="tradicional" name="Tradicional acumulado" stroke="hsl(var(--muted-foreground))" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="orion" name="ORION acumulado" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </div>
      </div>
    </>
  );
};

export default ROI;