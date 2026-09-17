import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Cloud, Droplets, Sparkles, MapPin, ArrowRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatKmPrecise } from "@/lib/km";
import { VegetationIndicesPanel } from "@/components/vegia/VegetationIndicesPanel";
import { GeeDataSourcePanel } from "@/components/vegia/DataSourcePanel";
import { DecisionZoneCard } from "@/components/vegia/DecisionZone";
import { segmentPriority } from "@/lib/operational-priority";
import { PRIORITY_LEVEL_LABEL } from "@/lib/vegetation-model";

import { useSegment } from "@/hooks/useVegiaData";
import { segmentOrigin } from "@/lib/data-provenance";

export interface PointInsightResult {
  point: { lat: number; lng: number };
  weather: {
    location: string; tempC: number; tempAvg24: number; humidity: number;
    description: string; icon: string; rainNext24Mm: number; rain5dMm: number;
  };
  nearest: { segmentId: string; km: string; status: string; distanceKm: number } | null;
  insight: { resumo: string; risco: "baixo" | "moderado" | "alto" | "critico"; recomendacao: string } | null;
}

interface Props {
  open: boolean;
  point: { lat: number; lng: number; label?: string } | null;
  /** Trecho real (tabela de segmentos) correspondente ao ponto selecionado. */
  segmentId?: string;
  /** Localização precisa projetada sobre o eixo da rodovia. */
  kmInfo?: { rodovia: string; km: number; offsetMeters: number } | null;
  onClose: () => void;
}

const riskColor = (r?: string) =>
  r === "critico" ? "text-destructive bg-destructive/10" :
  r === "alto" ? "text-tertiary bg-tertiary/10" :
  r === "moderado" ? "text-primary bg-primary/10" :
  "text-turquoise bg-turquoise/10";

export const MapPointSheet = ({ open, point, segmentId, kmInfo, onClose }: Props) => {
  const navigate = useNavigate();
  const [data, setData] = useState<PointInsightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: nearestSeg } = useSegment(segmentId ?? data?.nearest?.segmentId);


  useEffect(() => {
    if (!open || !point) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    setData(null);
    supabase.functions
      .invoke<PointInsightResult>("point-insight", { body: { lat: point.lat, lng: point.lng } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Falha ao analisar ponto", { description: error.message });
          return;
        }
        setData(data ?? null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, point?.lat, point?.lng]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            {point?.label ?? "Análise do ponto"}
          </SheetTitle>
          {point && (
            <p className="text-xs text-muted-foreground font-mono">
              {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
            </p>
          )}
          {kmInfo && (
            <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Localização na rodovia</div>
              <div className="text-sm font-semibold text-foreground">
                {kmInfo.rodovia} · {formatKmPrecise(kmInfo.km)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Desvio do eixo: {kmInfo.offsetMeters} m
                {kmInfo.offsetMeters > 150 && " — ponto fora da faixa de domínio"}
              </div>
            </div>
          )}
        </SheetHeader>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {open && point && (
          <div className="mb-5 space-y-4">
            <GeeDataSourcePanel lat={point.lat} lng={point.lng} enabled={open} />
            <VegetationIndicesPanel
              lat={point.lat}
              lng={point.lng}
              enabled={open}
              contexto={{ rodovia: kmInfo?.rodovia, trecho: kmInfo ? formatKmPrecise(kmInfo.km) : undefined }}
            />
          </div>
        )}

        {!loading && data && (
          <div className="space-y-5">
            {/* Clima */}
            <section className="rounded-xl border border-border bg-surface-low p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Cloud className="h-4 w-4" /> Clima local
                </div>
                <span className="text-[11px] text-muted-foreground">{data.weather.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={`https://openweathermap.org/img/wn/${data.weather.icon}@2x.png`}
                  alt={data.weather.description}
                  className="h-14 w-14 -m-2"
                />
                <div className="flex-1">
                  <div className="text-3xl font-bold leading-none">{data.weather.tempC}°C</div>
                  <div className="text-xs text-muted-foreground capitalize mt-1">{data.weather.description}</div>
                </div>
                <div className="text-right text-xs space-y-1">
                  <div className="flex items-center justify-end gap-1 text-muted-foreground">
                    <Droplets className="h-3.5 w-3.5" /> {data.weather.humidity}%
                  </div>
                  <div className="text-muted-foreground">
                    Chuva 24h: <span className="text-foreground font-semibold">{data.weather.rainNext24Mm} mm</span>
                  </div>
                  <div className="text-muted-foreground">
                    5 dias: <span className="text-foreground font-semibold">{data.weather.rain5dMm} mm</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Insight IA */}
            <section className="rounded-xl border border-border bg-surface-low p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> Insight da IA
                </div>
                {data.insight && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${riskColor(data.insight.risco)}`}>
                    Risco {data.insight.risco}
                  </span>
                )}
              </div>
              {data.insight ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed">{data.insight.resumo}</p>
                  <div className="flex items-start gap-2 text-sm bg-surface-high rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 text-tertiary mt-0.5 shrink-0" />
                    <p className="leading-relaxed">{data.insight.recomendacao}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">IA indisponível para este ponto.</p>
              )}
            </section>

            {/* Zona de decisão do segmento mais próximo */}
            {nearestSeg && (
              <DecisionZoneCard
                altura={nearestSeg.altura}
                limite={nearestSeg.limite}
                origin={segmentOrigin(nearestSeg)}
                clausula={nearestSeg.clausula}
              />
            )}

            {/* Prioridade operacional do segmento mais próximo */}
            {nearestSeg && (() => {
              const p = segmentPriority(nearestSeg, data.weather?.rain5dMm ?? 0);
              return (
                <section className="rounded-lg border border-border/50 bg-surface-low p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Prioridade operacional
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {p.score}/100 · {PRIORITY_LEVEL_LABEL[p.level]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                    Combina risco de altura estimada, vigor da vegetação, chuva dos últimos 5 dias e tempo desde a
                    última roçada. Serve para ordenar o trabalho das equipes — não é medição de campo nem conclusão
                    contratual.
                  </p>
                </section>
              );
            })()}


            {/* Segmento próximo */}
            {data.nearest && (
              <button
                onClick={() => { navigate(`/segmento/${data.nearest!.segmentId}`); onClose(); }}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-low hover:bg-surface-high p-4 text-left transition-colors"
              >
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Segmento mais próximo</div>
                  <div className="text-sm font-semibold mt-0.5">{data.nearest.km}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {data.nearest.distanceKm} km · status {data.nearest.status}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
