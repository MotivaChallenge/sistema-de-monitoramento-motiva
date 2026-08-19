import { useMemo } from "react";
import {
  Ruler, Satellite, Camera, TrendingUp, AlertTriangle, CheckCircle2, Target, FlaskConical,
} from "lucide-react";
import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip as RTooltip, XAxis, YAxis, ZAxis, ReferenceLine,
} from "recharts";
import { TopHeader } from "@/components/vegia/TopHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { HighwaySelect } from "@/components/vegia/HighwaySelect";
import { useCvResults, useSegments } from "@/hooks/useVegiaData";
import { useFilters } from "@/contexts/FiltersContext";
import { estimateHeightCm, heightModelSummary } from "@/lib/height-model";
import { GeeFieldTest } from "@/components/vegia/GeeFieldTest";

const PONTOS_TESTE = [
  { label: "Ponto de teste 1", lat: -23.443071, lng: -46.035497 },
  { label: "Ponto de teste 2", lat: -23.547778, lng: -46.755083, dms: `23°32'52,0"S 46°45'18,3"W` },
];

const fmt = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

const Prototipo = () => {
  const { rodovia, matches } = useFilters();
  const { data: allSegments = [], isLoading } = useSegments();
  const { data: cv = [] } = useCvResults();

  const segments = useMemo(
    () =>
      allSegments.filter(s =>
        matches({ status: s.status, kmStart: s.kmStart, kmEnd: s.kmEnd, rodovia: s.rodovia ?? null, text: `${s.km} ${s.tipo} ${s.id}` })
      ),
    [allSegments, matches]
  );

  const rows = useMemo(
    () =>
      segments.map(s => {
        const previsto = estimateHeightCm(s.ndvi);
        const erro = previsto - s.altura;
        return { id: s.id, km: s.km, rodovia: s.rodovia ?? "—", ndvi: s.ndvi, medido: s.altura, previsto, erro, limite: s.limite, status: s.status };
      }),
    [segments]
  );

  const stats = useMemo(() => {
    const n = rows.length;
    if (!n) return null;
    const abs = rows.reduce((a, r) => a + Math.abs(r.erro), 0) / n;
    const rmse = Math.sqrt(rows.reduce((a, r) => a + r.erro ** 2, 0) / n);
    const bias = rows.reduce((a, r) => a + r.erro, 0) / n;
    const mean = rows.reduce((a, r) => a + r.medido, 0) / n;
    const ssTot = rows.reduce((a, r) => a + (r.medido - mean) ** 2, 0);
    const ssRes = rows.reduce((a, r) => a + r.erro ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const within10 = (rows.filter(r => Math.abs(r.erro) <= 10).length / n) * 100;
    // Acerto de decisão: o modelo classifica acima/abaixo do limite igual à medição?
    const agree =
      (rows.filter(r => r.previsto > r.limite === r.medido > r.limite).length / n) * 100;
    return { n, abs, rmse, bias, r2, within10, agree };
  }, [rows]);

  const worst = useMemo(() => [...rows].sort((a, b) => Math.abs(b.erro) - Math.abs(a.erro)).slice(0, 8), [rows]);
  const scatter = useMemo(() => rows.slice(0, 400).map(r => ({ x: r.medido, y: r.previsto })), [rows]);
  // As confianças são gravadas em escala 0–100; valores 0–1 são normalizados.
  const cvAvg = useMemo(() => {
    if (!cv.length) return 0;
    const vals = cv
      .map(c => (Number.isFinite(c.confidence) ? (c.confidence <= 1 ? c.confidence * 100 : c.confidence) : 0))
      .map(v => Math.min(100, Math.max(0, v)));
    return vals.reduce((a, v) => a + v, 0) / vals.length;
  }, [cv]);

  return (
    <>
      <TopHeader
        breadcrumb={[{ label: "Motiva" }]}
        current="Testes do Protótipo"
        rightSlot={<HighwaySelect className="hidden sm:inline-flex" />}
      />

      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-5">
        <h1 className="sr-only">Testes do protótipo de medição de altura da vegetação</h1>

        {/* Método */}
        <section className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider mb-4">
            <FlaskConical className="h-4 w-4 text-primary" /> Como o protótipo mede a altura da vegetação
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { icon: Satellite, t: "1. Captura orbital", d: "Sentinel-2 SR Harmonized via Google Earth Engine, mediana de cenas com < 60% de nuvens." },
              { icon: TrendingUp, t: "2. Índice NDVI", d: "NDVI = (B8 − B4) / (B8 + B4), reduzido pela média em um buffer de 60 m no eixo da faixa de domínio." },
              { icon: Ruler, t: "3. Modelo de altura", d: heightModelSummary },
              { icon: Camera, t: "4. Conferência visual", d: "Visão computacional em imagens de nível de rua confirma presença e porte da vegetação." },
            ].map((s, i) => (
              <li key={i} className="rounded-lg border border-border/40 bg-surface-low p-3.5">
                <s.icon className="h-4 w-4 text-primary mb-2" />
                <p className="text-[12px] font-semibold mb-1">{s.t}</p>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Métricas de validação */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider">
            <Satellite className="h-4 w-4 text-primary" /> Leitura orbital nas coordenadas de teste
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {PONTOS_TESTE.map((p) => (
              <GeeFieldTest key={p.label} {...p} />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Consulta ao Sentinel-2 via Google Earth Engine em um raio de 150 m, com máscara de nuvens.
            Quando não há cena válida no período, o cartão exibe um valor simulado, sinalizado como tal.
          </p>
        </section>

        {isLoading || !stats ? (
          <Skeleton className="h-[130px] w-full rounded-xl" />
        ) : (
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Amostras validadas", value: String(stats.n), unit: `trechos${rodovia ? ` · ${rodovia}` : " na malha"}`, icon: Target },
              { label: "Erro médio absoluto", value: `${fmt(stats.abs)} cm`, unit: `viés ${stats.bias >= 0 ? "+" : ""}${fmt(stats.bias)} cm`, icon: Ruler },
              { label: "RMSE", value: `${fmt(stats.rmse)} cm`, unit: "dispersão do erro", icon: TrendingUp },
              { label: "R²", value: fmt(stats.r2, 2), unit: "modelo x medição", icon: FlaskConical },
              { label: "Acerto de decisão", value: `${fmt(stats.agree, 0)}%`, unit: "acima/abaixo do limite", icon: CheckCircle2 },
            ].map((m, i) => (
              <div key={i} className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4">
                <m.icon className="h-3.5 w-3.5 text-primary mb-2" />
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                <p className="text-[22px] font-bold tabular-nums leading-tight mt-1">{m.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{m.unit}</p>
              </div>
            ))}
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 items-start">
          {/* Dispersão */}
          <section className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider">Altura estimada x altura medida</h2>
              <span className="text-[11px] text-muted-foreground bg-surface-high px-2.5 py-1 rounded-full">
                {stats ? `${fmt(stats.within10, 0)}% dentro de ±10 cm` : "—"}
              </span>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Medido" unit=" cm" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="number" dataKey="y" name="Estimado" unit=" cm" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <ZAxis range={[36, 36]} />
                  <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 120, y: 120 }]} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
                  <RTooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      background: "hsl(var(--surface-lowest))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8, fontSize: 12,
                    }}
                  />
                  <Scatter data={scatter} fill="hsl(var(--primary))" fillOpacity={0.55} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              A linha tracejada representa o acerto perfeito. Pontos acima dela indicam superestimação do modelo NDVI; abaixo, subestimação.
            </p>
          </section>

          {/* Limitações */}
          <aside className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4 text-tertiary" /> Limitações e próximos passos
            </h2>
            <ul className="space-y-3">
              {[
                { t: "Cobertura de nuvens", d: "Em períodos chuvosos a revisita útil do Sentinel-2 cai. Mitigação: composição mediana de 15 dias e fallback para a última leitura válida." },
                { t: "Saturação do NDVI", d: "Acima de ~0,75 o índice satura e subestima vegetação muito densa. Próximo passo: incluir a banda SWIR e o índice NDMI no modelo." },
                { t: "Resolução de 10 m", d: "Faixas estreitas misturam pista e vegetação no mesmo pixel. Mitigação: buffer no eixo da faixa e máscara de pavimento." },
                { t: "Calibração de campo", d: "O modelo linear NDVI→altura foi ajustado com as medições disponíveis. Próximo passo: ampliar a base com medições em campo por régua e LiDAR de drone." },
                { t: "Validação visual", d: `Visão computacional em imagens de rua com confiança média de ${fmt(cvAvg, 0)}% (${cv.length} amostras) usada como conferência independente.` },
              ].map((l, i) => (
                <li key={i} className="border-l-2 border-border pl-3">
                  <p className="text-[12px] font-semibold">{l.t}</p>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-0.5">{l.d}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Amostras com maior divergência */}
        <section className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-3">Amostras com maior divergência</h2>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-[12px] min-w-[560px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                  <th className="text-left py-2 font-medium">Trecho</th>
                  <th className="text-left py-2 font-medium">Rodovia</th>
                  <th className="text-right py-2 font-medium">NDVI</th>
                  <th className="text-right py-2 font-medium">Medido</th>
                  <th className="text-right py-2 font-medium">Estimado</th>
                  <th className="text-right py-2 font-medium">Erro</th>
                </tr>
              </thead>
              <tbody>
                {worst.map(r => (
                  <tr key={r.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 font-medium">{r.km}</td>
                    <td className="py-2 text-muted-foreground">{r.rodovia}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(r.ndvi, 2)}</td>
                    <td className="py-2 text-right tabular-nums">{r.medido} cm</td>
                    <td className="py-2 text-right tabular-nums">{r.previsto} cm</td>
                    <td className={`py-2 text-right tabular-nums font-semibold ${Math.abs(r.erro) > 15 ? "text-destructive" : "text-muted-foreground"}`}>
                      {r.erro >= 0 ? "+" : ""}{r.erro} cm
                    </td>
                  </tr>
                ))}
                {!worst.length && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Sem amostras para os filtros atuais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
};

export default Prototipo;
