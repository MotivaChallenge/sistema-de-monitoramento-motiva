import { useMemo, useState } from "react";
import { Download, FlaskConical, Info, RefreshCw, Satellite, TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useGeeNdvi, type ZonalStats } from "@/hooks/useGeeNdvi";
import { INDEX_META, pixelConfidence, type IndexKey } from "@/lib/spectral-indices";

type Selection = IndexKey | "comparar";

const OPTIONS: { key: Selection; label: string }[] = [
  { key: "ndvi", label: "NDVI" },
  { key: "evi", label: "EVI" },
  { key: "savi", label: "SAVI" },
  { key: "comparar", label: "Comparar" },
];

const fmt = (v: number | null, d = 3) =>
  v === null || v === undefined ? "—" : v.toFixed(d).replace(".", ",");

const confBadge = (n: number) => {
  const c = pixelConfidence(n);
  return c === "alta"
    ? { label: "Confiança alta", cls: "text-turquoise bg-turquoise/10" }
    : c === "media"
    ? { label: "Confiança média", cls: "text-tertiary bg-tertiary/10" }
    : { label: "Confiança baixa", cls: "text-destructive bg-destructive/10" };
};

interface Props {
  lat?: number;
  lng?: number;
  enabled?: boolean;
  /** Identificação do trecho para rastreabilidade na exportação. */
  contexto?: { rodovia?: string; trecho?: string };
}

export const VegetationIndicesPanel = ({ lat, lng, enabled = true, contexto }: Props) => {
  const [selection, setSelection] = useState<Selection>("ndvi");
  const [experimental, setExperimental] = useState(false);
  const query = useGeeNdvi(lat, lng, enabled, { resample5m: experimental });
  const { data, isLoading, isFetching, isError, error, refetch } = query;

  const rows = useMemo(() => {
    if (!data) return [];
    const keys: IndexKey[] = selection === "comparar" ? ["ndvi", "evi", "savi"] : [selection];
    return keys.map((k) => ({ key: k, stats: data.indices[k] as ZonalStats }));
  }, [data, selection]);

  const exportCsv = () => {
    if (!data) return;
    const header = [
      "rodovia", "trecho", "lat", "lng", "periodo_de", "periodo_ate", "indice",
      "media", "mediana", "minimo", "maximo", "desvio_padrao",
      "pixels_validos", "resolucao_m", "reamostragem", "experimental",
    ];
    const lines: string[][] = [];
    const push = (k: IndexKey, s: ZonalStats, res: number, resample: string, exp: boolean) =>
      lines.push([
        contexto?.rodovia ?? "", contexto?.trecho ?? "",
        String(data.point.lat), String(data.point.lng),
        data.periodo.de, data.periodo.ate, INDEX_META[k].label,
        fmt(s.mean, 4), fmt(s.median, 4), fmt(s.min, 4), fmt(s.max, 4), fmt(s.stdDev, 4),
        String(s.validPixels), String(res), resample, exp ? "sim" : "nao",
      ]);
    (["ndvi", "evi", "savi"] as IndexKey[]).forEach((k) => push(k, data.indices[k], 10, "nativa", false));
    if (data.experimental5m) {
      (["ndvi", "evi", "savi"] as IndexKey[]).forEach((k) =>
        push(k, data.experimental5m!.indices[k], 5, data.experimental5m!.metadata.resampling_method, true));
    }
    const csv = [header, ...lines].map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `indices-vegetacao-${data.periodo.ate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado", { description: "Índices, resolução e pixels válidos incluídos." });
  };

  return (
    <section className="rounded-xl border border-border bg-surface-low p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Satellite className="h-4 w-4 text-primary" /> Índices de vegetação
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Atualizar índices"
            className="h-7 w-7 grid place-items-center rounded-md border border-border hover:bg-surface-high disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={exportCsv}
            disabled={!data?.hasData}
            aria-label="Exportar índices em CSV"
            className="h-7 w-7 grid place-items-center rounded-md border border-border hover:bg-surface-high disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Seletor de índice */}
      <div className="flex flex-wrap gap-1 mb-3" role="tablist" aria-label="Selecionar índice espectral">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            role="tab"
            aria-selected={selection === o.key}
            onClick={() => setSelection(o.key)}
            className={`px-2.5 h-7 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              selection === o.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-surface-high"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : isError ? (
        <p className="text-sm text-muted-foreground">
          Falha ao consultar o Earth Engine{error instanceof Error ? `: ${error.message}` : ""}.
        </p>
      ) : !data?.hasData ? (
        <p className="text-sm text-muted-foreground">
          Sem dados suficientes: nenhuma imagem Sentinel-2 válida (sem nuvens) no período.
        </p>
      ) : (
        <div className="space-y-3">
          {data.quality.lowPixelCount && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-[11px]">
              <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Poucos pixels válidos ({data.quality.validPixels}) — resultado pouco representativo.
            </div>
          )}

          {rows.map(({ key, stats }) => {
            const meta = INDEX_META[key];
            const badge = confBadge(stats.validPixels);
            return (
              <div key={key} className="rounded-lg border border-border bg-surface-lowest p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1.5 text-[12px] font-semibold">
                        {meta.label} <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[260px] text-[11px]">
                        {meta.formula} · bandas {meta.bands}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-end gap-5">
                  <div>
                    <div className="text-2xl font-bold leading-none tabular-nums">{fmt(stats.mean)}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">média</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold leading-none tabular-nums">{fmt(stats.median)}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">mediana</div>
                  </div>
                  <div className="ml-auto text-right text-[10px] text-muted-foreground leading-tight">
                    mín {fmt(stats.min, 2)} · máx {fmt(stats.max, 2)}<br />
                    dp {fmt(stats.stdDev, 2)} · {stats.validPixels} px válidos
                  </div>
                </div>
                {key === "ndvi" ? (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Altura estimada atual: <span className="text-foreground font-semibold">{data.alturaEstimadaCm} cm</span> —
                    modelo calibrado com NDVI ({data.heightModel}).
                  </p>
                ) : (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Índice adicional para análise e futura calibração — não deve ser interpretado como altura
                    nem usado para conformidade ou alertas.
                  </p>
                )}
              </div>
            );
          })}

          {selection === "comparar" && (
            <div className="space-y-1.5">
              {(["ndvi", "evi", "savi"] as IndexKey[]).map((k) => {
                const meta = INDEX_META[k];
                const v = data.indices[k].mean;
                const [lo, hi] = meta.range;
                const pct = v === null ? 0 : ((v - lo) / (hi - lo)) * 100;
                return (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-10 text-[10px] uppercase text-muted-foreground">{meta.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-high overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                    </div>
                    <span className="w-12 text-right text-[10px] tabular-nums">{fmt(v, 2)}</span>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground leading-snug pt-1">
                Escalas diferentes: NDVI (−1 a 1), EVI (−1 a 2,5) e SAVI (−1,5 a 1,5). O EVI reduz saturação em
                vegetação densa e o SAVI corrige influência do solo exposto — não são comparáveis em valor absoluto.
              </p>
            </div>
          )}

          {/* Metadados de aquisição */}
          <div className="text-[10px] text-muted-foreground leading-snug border-t border-border pt-2">
            {data.source} · {data.imagens} imagens · {data.periodo.de} → {data.periodo.ate}<br />
            Composição: {data.quality.composite} · Máscara: {data.quality.cloudMask}<br />
            Buffer {data.radiusMeters} m · resolução nativa {data.quality.nativeResolutionM} m · L SAVI {String(data.quality.saviL).replace(".", ",")}
          </div>

          {/* Modo experimental 5 m */}
          <div className="rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <FlaskConical className="h-3.5 w-3.5 text-tertiary" />
                Subdivisão espacial experimental (5 m)
              </div>
              <Switch checked={experimental} onCheckedChange={setExperimental} aria-label="Ativar grade experimental de 5 m" />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground leading-snug">
              Resolução nativa Sentinel-2: aproximadamente 10 m. A grade de 5 m é obtida por reamostragem
              (bilinear) apenas para visualização e amostragem — não cria informação espectral nova e não altera
              altura, conformidade, criticidade ou alertas. Separar pista e vegetação dentro do pixel exige fonte
              de maior resolução (drone ou ortofoto).
            </p>
            {experimental && data.experimental5m && (
              <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                {(["ndvi", "evi", "savi"] as IndexKey[]).map((k) => (
                  <div key={k} className="flex justify-between tabular-nums">
                    <span>{INDEX_META[k].label} reamostrado</span>
                    <span>
                      média {fmt(data.experimental5m!.indices[k].mean)} · {data.experimental5m!.indices[k].validPixels} células
                    </span>
                  </div>
                ))}
                <div className="pt-1 border-t border-border">
                  nativa {data.experimental5m.metadata.native_resolution_m} m ({data.experimental5m.metadata.valid_native_pixel_count} px) ·
                  exibição {data.experimental5m.metadata.display_resolution_m} m ·
                  método {data.experimental5m.metadata.resampling_method}
                </div>
              </div>
            )}
            {experimental && !data.experimental5m && (
              <p className="mt-2 text-[10px] text-destructive">Grade experimental indisponível para este ponto.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
