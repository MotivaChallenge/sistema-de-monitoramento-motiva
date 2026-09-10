import { Satellite, Info } from "lucide-react";
import { MethodologyDialog } from "./MethodologyDialog";
import { DataOriginBadge } from "./DataOriginBadge";
import { SATELLITE_DISCLAIMER } from "@/lib/uncertainty";
import { useGeeNdvi, type GeeNdviResult } from "@/hooks/useGeeNdvi";

export interface DataSourceInfo {
  periodo?: { de: string; ate: string } | null;
  imagens?: number | null;
  validPixels?: number | null;
  nativeResolutionM?: number | null;
  bufferM?: number | null;
  composite?: string | null;
  cloudMask?: string | null;
  updatedAt?: string | Date | null;
  /** Quando true, os metadados são ilustrativos (sem leitura orbital carregada). */
  demo?: boolean;
}

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
};

const fmtDateTime = (v?: string | Date | null) => {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("pt-BR");
};

/** Converte a resposta da Edge Function `gee-ndvi` no formato do painel. */
export const fromGee = (g?: GeeNdviResult | null, updatedAt?: Date | null): DataSourceInfo => ({
  periodo: g?.periodo ?? null,
  imagens: g?.imagens ?? null,
  validPixels: g?.quality?.validPixels ?? null,
  nativeResolutionM: g?.quality?.nativeResolutionM ?? 10,
  bufferM: g ? 150 : null,
  composite: g?.quality?.composite ?? null,
  cloudMask: g?.quality?.cloudMask ?? null,
  updatedAt: updatedAt ?? (g ? new Date() : null),
  demo: !g,
});

interface Props {
  info?: DataSourceInfo;
  className?: string;
  /** Título alternativo. */
  title?: string;
  /** Nota adicional exibida no rodapé do painel. */
  note?: string;
}

/**
 * "Fonte e qualidade do dado" — resumo sempre visível de como o dado foi capturado.
 * Nunca inventa medições: sem leitura orbital carregada, marca como demonstrativo.
 */
export const DataSourcePanel = ({ info = {}, className = "", title = "Fonte e qualidade do dado", note }: Props) => {
  const demo = info.demo ?? false;
  const rows: { label: string; value: string }[] = [
    { label: "Fonte principal", value: "Sentinel-2 SR Harmonized" },
    { label: "Processamento", value: "Google Earth Engine" },
    {
      label: "Período analisado",
      value: info.periodo ? `${fmtDate(info.periodo.de)} → ${fmtDate(info.periodo.ate)}` : "últimos 60 dias",
    },
    { label: "Nº de imagens", value: info.imagens != null ? `${info.imagens} cena(s)` : NOT_COMPUTED },
    { label: "Composição", value: info.composite ?? "mediana temporal · CLOUDY_PIXEL_PERCENTAGE < 60" },
    { label: "Filtro de nuvens", value: "CLOUDY_PIXEL_PERCENTAGE < 60" },
    { label: "Máscara", value: info.cloudMask ?? "SCL (classes 4, 5, 6, 7, 11)" },
    { label: "Resolução nativa", value: `${info.nativeResolutionM ?? 10} m/pixel` },
    { label: "Buffer analisado", value: `${info.bufferM ?? 150} m` },
    { label: "Pixels válidos", value: info.validPixels != null ? `${info.validPixels}` : NOT_COMPUTED },
    { label: "Atualização", value: fmtDateTime(info.updatedAt) },
  ];

  return (
    <section
      className={`rounded-xl border border-border/60 bg-surface-lowest p-4 md:p-5 shadow-card ${className}`}
      aria-label={title}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider">
          <Satellite className="h-4 w-4 text-primary" aria-hidden="true" /> {title}
        </h2>
        <div className="flex items-center gap-2">
          <DataOriginBadge origin={demo ? "demo" : "satelite"} />
          <MethodologyDialog />
        </div>
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2.5">
        {rows.map(r => (
          <div key={r.label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.label}</dt>
            <dd className="text-[12.5px] font-semibold leading-snug break-words">{r.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 flex gap-2 text-[12px] leading-relaxed text-muted-foreground border-t border-border/50 pt-3">
        <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>{SATELLITE_DISCLAIMER}</span>
      </p>

      {demo && (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Metadados de referência — sem leitura orbital carregada para este contexto (dados demonstrativos).
        </p>
      )}
      {note && <p className="mt-2 text-[12px] text-muted-foreground">{note}</p>}
    </section>
  );
};

/** Painel alimentado pela leitura orbital real do ponto (mesmo cache do painel de índices). */
export const GeeDataSourcePanel = ({
  lat, lng, enabled = true, className = "",
}: { lat?: number; lng?: number; enabled?: boolean; className?: string }) => {
  const { data, dataUpdatedAt } = useGeeNdvi(lat, lng, enabled);
  const info = fromGee(data, dataUpdatedAt ? new Date(dataUpdatedAt) : null);
  return <DataSourcePanel info={info} className={className} />;
};
