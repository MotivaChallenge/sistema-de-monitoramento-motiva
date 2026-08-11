import { useMemo, useState } from "react";
import { Database, Download, Play, Ruler, Sprout, CalendarClock } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { TopHeader } from "@/components/vegia/TopHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useHighways, useSegments } from "@/hooks/useVegiaData";
import { datasetToCsv, downloadFile, generateDataset, DatasetRow } from "@/lib/dataset-generator";
import { formatDateBR } from "@/lib/utils";
import { toast } from "sonner";

const todayIso = () => new Date().toISOString().slice(0, 10);
const monthsAgoIso = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};
const fmt = (n: number, d = 2) => n.toFixed(d).replace(".", ",");

const STATUS_CLS: Record<string, string> = {
  critico: "bg-destructive/15 text-destructive",
  atencao: "bg-tertiary/15 text-tertiary",
  conforme: "bg-primary/10 text-primary",
};

const Dataset = () => {
  const { data: highways = [] } = useHighways();
  const { data: segments = [], isLoading } = useSegments();

  const [rodovia, setRodovia] = useState("");
  const [kmMin, setKmMin] = useState("");
  const [kmMax, setKmMax] = useState("");
  const [start, setStart] = useState(monthsAgoIso(6));
  const [end, setEnd] = useState(todayIso());
  const [step, setStep] = useState(15);
  const [rows, setRows] = useState<DatasetRow[] | null>(null);

  const selected = useMemo(() => {
    const min = kmMin === "" ? -Infinity : Number(kmMin);
    const max = kmMax === "" ? Infinity : Number(kmMax);
    return segments.filter(
      s => (!rodovia || s.rodovia === rodovia) && s.kmStart >= min && s.kmStart <= max
    );
  }, [segments, rodovia, kmMin, kmMax]);

  const run = () => {
    if (!selected.length) return toast.error("Nenhum trecho no filtro selecionado.");
    if (end < start) return toast.error("O fim do período deve ser posterior ao início.");
    const data = generateDataset({ segments: selected, start, end, stepDays: step });
    setRows(data);
    toast.success(`Dataset gerado: ${data.length.toLocaleString("pt-BR")} leituras`);
  };

  const stats = useMemo(() => {
    if (!rows?.length) return null;
    const n = rows.length;
    const ndvi = rows.reduce((a, r) => a + r.ndvi, 0) / n;
    const altura = rows.reduce((a, r) => a + r.altura_estimada_cm, 0) / n;
    const criticos = rows.filter(r => r.status === "critico").length;
    const rocadas = rows.filter(r => r.rocada_executada).length;
    return { n, ndvi, altura, criticos, rocadas, trechos: new Set(rows.map(r => r.segmento_id)).size };
  }, [rows]);

  const chart = useMemo(() => {
    if (!rows?.length) return [];
    const by = new Map<string, { ndvi: number; alt: number; n: number }>();
    rows.forEach(r => {
      const acc = by.get(r.data) ?? { ndvi: 0, alt: 0, n: 0 };
      acc.ndvi += r.ndvi; acc.alt += r.altura_estimada_cm; acc.n += 1;
      by.set(r.data, acc);
    });
    return [...by.entries()].sort().map(([d, v]) => ({
      label: formatDateBR(d).slice(0, 5),
      ndvi: Number((v.ndvi / v.n).toFixed(3)),
      altura: Math.round(v.alt / v.n),
    }));
  }, [rows]);

  const baseName = `dataset-${rodovia || "malha"}-${start}_${end}`;

  return (
    <>
      <TopHeader breadcrumb={[{ label: "Motiva" }]} current="Gerador de Dataset" />

      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-5">
        <h1 className="sr-only">Gerador de dataset de NDVI, altura, roçadas e prazos</h1>

        {/* Parâmetros */}
        <section className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider mb-4">
            <Database className="h-4 w-4 text-primary" /> Parâmetros da geração
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <label className="col-span-2 lg:col-span-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Rodovia
              <select
                value={rodovia}
                onChange={e => setRodovia(e.target.value)}
                className="mt-1.5 w-full h-9 rounded-md border border-border bg-background px-2 text-[13px] text-foreground normal-case tracking-normal"
              >
                <option value="">Toda a malha</option>
                {highways.map(h => (
                  <option key={h.code} value={h.code}>{h.code} — {h.nome}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              KM inicial
              <Input value={kmMin} onChange={e => setKmMin(e.target.value)} inputMode="decimal" placeholder="0" className="mt-1.5 h-9 text-[13px]" />
            </label>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              KM final
              <Input value={kmMax} onChange={e => setKmMax(e.target.value)} inputMode="decimal" placeholder="180" className="mt-1.5 h-9 text-[13px]" />
            </label>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Início
              <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="mt-1.5 h-9 text-[13px]" />
            </label>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Fim
              <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="mt-1.5 h-9 text-[13px]" />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Frequência</span>
              {[7, 15, 30].map(v => (
                <button
                  key={v}
                  onClick={() => setStep(v)}
                  aria-pressed={step === v}
                  className={`text-[11.5px] font-semibold px-3 py-1 rounded-full border transition ${
                    step === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-surface-high"
                  }`}
                >
                  {v} dias
                </button>
              ))}
              <span className="text-[11.5px] text-muted-foreground ml-2">
                {selected.length} trecho(s) no filtro
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={run}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold uppercase tracking-wider hover:opacity-90 transition-smooth"
              >
                <Play className="h-3.5 w-3.5" /> Gerar dataset
              </button>
              <button
                disabled={!rows?.length}
                onClick={() => downloadFile(`${baseName}.csv`, datasetToCsv(rows!), "text/csv;charset=utf-8")}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[12px] font-semibold uppercase tracking-wider hover:bg-surface-low disabled:opacity-40 transition-smooth"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                disabled={!rows?.length}
                onClick={() => downloadFile(`${baseName}.json`, JSON.stringify(rows, null, 2), "application/json")}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[12px] font-semibold uppercase tracking-wider hover:bg-surface-low disabled:opacity-40 transition-smooth"
              >
                <Download className="h-3.5 w-3.5" /> JSON
              </button>
            </div>
          </div>
        </section>

        {isLoading && <Skeleton className="h-[120px] w-full rounded-xl" />}

        {stats && (
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Leituras geradas", value: stats.n.toLocaleString("pt-BR"), unit: `${stats.trechos} trechos`, icon: Database },
              { label: "NDVI médio", value: fmt(stats.ndvi), unit: "período completo", icon: Sprout },
              { label: "Altura média", value: `${Math.round(stats.altura)} cm`, unit: "estimada pelo modelo", icon: Ruler },
              { label: "Leituras críticas", value: String(stats.criticos), unit: `${fmt((stats.criticos / stats.n) * 100, 0)}% do total`, icon: CalendarClock },
              { label: "Roçadas simuladas", value: String(stats.rocadas), unit: "com prazo contratual", icon: Play },
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

        {!!chart.length && (
          <section className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-3">Evolução média no período</h2>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--surface-lowest))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8, fontSize: 12,
                    }}
                  />
                  <Line yAxisId="l" type="monotone" dataKey="ndvi" name="NDVI" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line yAxisId="r" type="monotone" dataKey="altura" name="Altura (cm)" stroke="hsl(var(--tertiary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {!!rows?.length && (
          <section className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider">Prévia do dataset</h2>
              <span className="text-[11px] text-muted-foreground">primeiras 50 de {rows.length.toLocaleString("pt-BR")} linhas</span>
            </div>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-[12px] min-w-[820px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2 font-medium">Data</th>
                    <th className="text-left py-2 font-medium">Trecho</th>
                    <th className="text-left py-2 font-medium">Rodovia</th>
                    <th className="text-right py-2 font-medium">NDVI</th>
                    <th className="text-right py-2 font-medium">Altura</th>
                    <th className="text-right py-2 font-medium">Limite</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Última roçada</th>
                    <th className="text-left py-2 font-medium">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={`${r.segmento_id}-${r.data}-${i}`} className="border-b border-border/30 last:border-0">
                      <td className="py-2 tabular-nums">{formatDateBR(r.data)}</td>
                      <td className="py-2 font-medium">{r.km}</td>
                      <td className="py-2 text-muted-foreground">{r.rodovia}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(r.ndvi)}</td>
                      <td className="py-2 text-right tabular-nums">{r.altura_estimada_cm} cm</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{r.limite_cm} cm</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase ${STATUS_CLS[r.status]}`}>{r.status}</span>
                      </td>
                      <td className="py-2 tabular-nums text-muted-foreground">{formatDateBR(r.ultima_rocada)}</td>
                      <td className="py-2 tabular-nums text-muted-foreground">{r.prazo_contratual ? formatDateBR(r.prazo_contratual) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default Dataset;
