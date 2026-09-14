import { useState } from "react";
import { Satellite, Info, ChevronDown, Calendar, Image, ShieldCheck, Clock } from "lucide-react";
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

/** Valor ausente nunca aparece como placeholder silencioso. */
export const NOT_COMPUTED = "não calculado nesta execução";

const NOT_COMPUTED_HINT =
  "Esta execução não retornou o metadado. Pode significar que não havia leitura orbital carregada para o recorte ou que a consulta foi respondida pelo cache sem recalcular a estatística zonal.";

const fmtDate = (v?: string | null) => {
  if (!v) return NOT_COMPUTED;
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
};

const fmtDateTime = (v?: string | Date | null) => {
  if (!v) return NOT_COMPUTED;
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
 * "Origem dos dados" — resumo sempre visível de como o dado foi capturado.
 * Nunca inventa medições: sem leitura orbital carregada, marca como demonstrativo.
 */
export const DataSourcePanel = ({ info = {}, className = "", title = "Origem dos dados", note }: Props) => {
  const demo = info.demo ?? false;
  const [open, setOpen] = useState(false);

  const periodText = info.periodo
    ? `${fmtDate(info.periodo.de)} → ${fmtDate(info.periodo.ate)}`
    : "últimos 60 dias";

  const qualityText =
    info.imagens != null && info.validPixels != null
      ? `${info.imagens} imagens · ${info.validPixels.toLocaleString("pt-BR")} pixels válidos`
      : info.imagens != null
        ? `${info.imagens} imagens`
        : info.validPixels != null
          ? `${info.validPixels.toLocaleString("pt-BR")} pixels válidos`
          : NOT_COMPUTED;

  const mainItems = [
    {
      icon: Satellite,
      label: "Fonte",
      value: "Sentinel-2",
      detail: "Satélite · Google Earth Engine",
    },
    {
      icon: Calendar,
      label: "Período analisado",
      value: periodText,
      detail: "Intervalo de datas das imagens",
    },
    {
      icon: Image,
      label: "Qualidade da leitura",
      value: qualityText,
      detail: info.cloudMask ?? "Filtro de nuvens e pixels de vegetação",
      warning: qualityText === NOT_COMPUTED,
    },
    {
      icon: Clock,
      label: "Última atualização",
      value: fmtDateTime(info.updatedAt),
      detail: "Processamento mais recente",
    },
  ];

  const details: { label: string; value: string; hint?: string }[] = [
    { label: "Fonte principal", value: "Sentinel-2 SR Harmonized" },
    { label: "Processamento", value: "Google Earth Engine" },
    { label: "Período analisado", value: periodText },
    {
      label: "Nº de imagens",
      value: info.imagens != null ? `${info.imagens} cena(s)` : NOT_COMPUTED,
      hint: NOT_COMPUTED_HINT,
    },
    {
      label: "Composição",
      value: info.composite ?? "mediana temporal · CLOUDY_PIXEL_PERCENTAGE < 60",
    },
    { label: "Filtro de nuvens", value: "CLOUDY_PIXEL_PERCENTAGE < 60" },
    { label: "Máscara", value: info.cloudMask ?? "SCL (classes 4, 5, 6, 7, 11)" },
    {
      label: "Resolução nativa",
      value: `${info.nativeResolutionM ?? 10} m/pixel`,
    },
    { label: "Buffer analisado", value: `${info.bufferM ?? 150} m` },
    {
      label: "Pixels válidos",
      value: info.validPixels != null ? `${info.validPixels.toLocaleString("pt-BR")}` : NOT_COMPUTED,
      hint: NOT_COMPUTED_HINT,
    },
    { label: "Atualização", value: fmtDateTime(info.updatedAt) },
  ];

  return (
    <section
      className={`rounded-lg border border-border/60 bg-surface-lowest p-4 md:p-5 shadow-card ${className}`}
      aria-label={title}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Satellite className="h-4 w-4 text-primary" aria-hidden="true" />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <DataOriginBadge origin={demo ? "demo" : "satelite"} />
          <MethodologyDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mainItems.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-border/40 bg-surface p-3.5 flex gap-3 items-start"
          >
            <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary shrink-0">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground leading-none mb-1">
                {item.label}
              </p>
              <p
                className={`text-[15px] font-semibold leading-tight ${item.warning ? "text-muted-foreground italic font-normal" : ""}`}
                title={item.warning ? NOT_COMPUTED_HINT : undefined}
              >
                {item.value}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-md bg-amber-500/8 border border-amber-500/15 p-3 text-[12px] leading-relaxed text-foreground/90">
        <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
        <span>{SATELLITE_DISCLAIMER}</span>
      </div>

      {demo && (
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Metadados de referência — sem leitura orbital carregada para este contexto.
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 flex w-full items-center justify-between gap-2 rounded-md border border-border/40 bg-surface px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-surface-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Detalhes técnicos da coleta
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-border/40 bg-surface p-3.5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            {details.map((d) => (
              <div key={d.label} className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.label}</dt>
                <dd
                  className={`text-[12px] font-medium leading-snug break-words ${d.value === NOT_COMPUTED ? "text-muted-foreground italic font-normal" : ""}`}
                  title={d.hint}
                >
                  {d.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {note && <p className="mt-3 text-[12px] text-muted-foreground">{note}</p>}
    </section>
  );
};

/** Painel alimentado pela leitura orbital real do ponto (mesmo cache do painel de índices). */
export const GeeDataSourcePanel = ({
  lat,
  lng,
  enabled = true,
  className = "",
}: {
  lat?: number;
  lng?: number;
  enabled?: boolean;
  className?: string;
}) => {
  const { data, dataUpdatedAt } = useGeeNdvi(lat, lng, enabled);
  const info = fromGee(data, dataUpdatedAt ? new Date(dataUpdatedAt) : null);
  return <DataSourcePanel info={info} className={className} />;
};
