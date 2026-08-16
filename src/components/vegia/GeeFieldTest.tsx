import { useMemo } from "react";
import { MapPin, Satellite, Ruler, RefreshCw, FlaskConical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeeNdvi } from "@/hooks/useGeeNdvi";
import { estimateHeightCm } from "@/lib/height-model";
import { INDEX_META, pixelConfidence, type IndexKey } from "@/lib/spectral-indices";

const fmt = (v: number | null | undefined, d = 3) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(d).replace(".", ",");

/** Simulação determinística (fallback) quando o Earth Engine não retorna pixels válidos. */
const simulate = (lat: number, lng: number) => {
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453) % 1;
  const ndvi = 0.32 + seed * 0.3;
  return {
    ndvi,
    evi: ndvi * 0.85,
    savi: ndvi * 0.72,
    alturaCm: estimateHeightCm(ndvi),
  };
};

interface Props {
  label: string;
  lat: number;
  lng: number;
  dms?: string;
}

export const GeeFieldTest = ({ label, lat, lng, dms }: Props) => {
  const { data, isLoading, isFetching, isError, refetch } = useGeeNdvi(lat, lng);

  const view = useMemo(() => {
    if (data?.hasData && data.ndvi !== null) {
      return {
        simulado: false,
        ndvi: data.indices.ndvi.mean,
        evi: data.indices.evi.mean,
        savi: data.indices.savi.mean,
        alturaCm: data.alturaEstimadaCm ?? estimateHeightCm(data.ndvi),
        pixels: data.quality.validPixels,
        imagens: data.imagens,
        periodo: `${data.periodo.de} → ${data.periodo.ate}`,
      };
    }
    if (isLoading) return null;
    const s = simulate(lat, lng);
    return { simulado: true, ...s, pixels: 0, imagens: 0, periodo: "sem cena válida no período" };
  }, [data, isLoading, lat, lng]);

  if (isLoading || !view) return <Skeleton className="h-[188px] w-full rounded-xl" />;

  const conf = view.simulado ? "simulada" : pixelConfidence(view.pixels);

  return (
    <div className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {label}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
            {lat.toFixed(6)}, {lng.toFixed(6)}{dms ? ` · ${dms}` : ""}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Recarregar leitura de ${label}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="text-[26px] font-bold tabular-nums leading-none">{fmt(view.ndvi, 3)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">NDVI médio</p>
        </div>
        <div>
          <p className="text-[20px] font-semibold tabular-nums leading-none flex items-center gap-1">
            <Ruler className="h-4 w-4 text-primary" /> {view.alturaCm}
            <span className="text-[12px] font-normal text-muted-foreground">cm</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Altura estimada do mato</p>
        </div>
        <div className="ml-auto text-right text-[10.5px] text-muted-foreground leading-tight">
          {view.simulado ? (
            <span className="inline-flex items-center gap-1 text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">
              <FlaskConical className="h-3 w-3" /> valor simulado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Satellite className="h-3 w-3" /> {view.imagens} cenas · {view.pixels} px · conf. {conf}
            </span>
          )}
          <br />{view.periodo}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {(["ndvi", "evi", "savi"] as IndexKey[]).map((k) => (
          <div key={k} className="rounded-lg border border-border/40 bg-surface-low p-2.5">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{INDEX_META[k].label}</p>
            <p className="text-[15px] font-semibold tabular-nums">{fmt(view[k as "ndvi" | "evi" | "savi"], 3)}</p>
          </div>
        ))}
      </div>

      {isError && !view.simulado && (
        <p className="text-[11px] text-destructive mt-3">Falha ao consultar o Earth Engine.</p>
      )}
    </div>
  );
};
