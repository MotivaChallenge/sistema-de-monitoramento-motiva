import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, AlertTriangle, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { useSegments } from "@/hooks/useVegiaData";

interface Recommendation {
  title: string;
  description: string;
  urgency: "baixa" | "media" | "alta";
  target_segments?: string[];
}
interface InsightsResponse {
  insights: {
    summary: string;
    priority: "baixa" | "media" | "alta" | "critica";
    weather_impact: string;
    recommendations: Recommendation[];
    risks: string[];
  };
  generated_at: string;
}

const priorityStyles: Record<string, string> = {
  baixa: "bg-primary/10 text-primary",
  media: "bg-tertiary/15 text-tertiary",
  alta: "bg-destructive/15 text-destructive",
  critica: "bg-destructive text-destructive-foreground",
};
const urgencyStyles: Record<string, string> = {
  baixa: "border-primary/40 text-primary",
  media: "border-tertiary/50 text-tertiary",
  alta: "border-destructive/50 text-destructive",
};

export const AIInsightsPanel = () => {
  const qc = useQueryClient();
  const { data: allSegments } = useSegments();
  const [statuses, setStatuses] = useState<Array<"critico" | "atencao" | "conforme">>([]);
  const [kmRange, setKmRange] = useState<[number, number] | null>(null);

  /** Limite do slider derivado da malha carregada, não fixo. */
  const kmMax = useMemo(
    () => Math.max(1, Math.ceil((allSegments ?? []).reduce((a, s) => Math.max(a, s.kmEnd), 0))),
    [allSegments]
  );
  const range: [number, number] = kmRange ?? [0, kmMax];

  const filters = useMemo(
    () => ({ statuses, kmStart: range[0], kmEnd: range[1] }),
    [statuses, range[0], range[1]]
  );

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["ai-insights", filters],
    queryFn: async (): Promise<InsightsResponse> => {
      const { data, error } = await supabase.functions.invoke("ai-insights", { body: filters });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as InsightsResponse;
    },
    staleTime: 1000 * 60 * 10,
  });

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["ai-insights", filters] });
    toast.success("Insights atualizados pela IA");
  };

  const toggleStatus = (s: "critico" | "atencao" | "conforme") => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const statusChips: Array<{ key: "critico" | "atencao" | "conforme"; label: string; cls: string }> = [
    { key: "critico", label: "Crítico", cls: "bg-destructive/15 text-destructive border-destructive/40" },
    { key: "atencao", label: "Atenção", cls: "bg-tertiary/15 text-tertiary border-tertiary/50" },
    { key: "conforme", label: "Conforme", cls: "bg-primary/10 text-primary border-primary/40" },
  ];

  return (
    <section className="bg-surface-lowest rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold tracking-wide uppercase flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Insights da IA
        </h3>
        <div className="flex items-center gap-2">
          {data && (
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${priorityStyles[data.insights.priority]}`}>
              Prioridade {data.insights.priority}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border border-border hover:bg-surface-low disabled:opacity-50"
          >
            {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface-low rounded-lg p-4 mb-5 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Status</div>
          <div className="flex flex-wrap gap-2">
            {statusChips.map((c) => {
              const active = statuses.includes(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggleStatus(c.key)}
                  className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border transition ${
                    active ? c.cls : "border-border text-muted-foreground hover:bg-surface-high"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
            {statuses.length > 0 && (
              <button
                onClick={() => setStatuses([])}
                className="text-[11px] uppercase tracking-wider px-3 py-1 rounded-full text-muted-foreground hover:text-foreground"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Faixa de KM</div>
            <div className="text-[12px] font-mono">
              {kmRange ? `KM ${kmRange[0]} – ${kmRange[1]}` : "Toda a malha"}
            </div>
          </div>
          <Slider
            min={0}
            max={kmMax}
            step={1}
            value={range}
            onValueChange={(v) => setKmRange([v[0], v[1]] as [number, number])}
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> A IA está analisando os dados…
        </div>
      )}
      {error && <div className="text-[12px] text-destructive">Erro ao gerar insights: {(error as Error).message}</div>}

      {data && (
        <div className="space-y-5">
          <p className="text-[13px] leading-relaxed text-foreground">{data.insights.summary}</p>

          <div className="bg-surface-low rounded-lg p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Impacto do clima</div>
            <p className="text-[12px] leading-relaxed">{data.insights.weather_impact}</p>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> Recomendações
            </div>
            <ul className="space-y-2">
              {data.insights.recommendations.map((r, i) => (
                <li key={i} className={`border-l-2 pl-3 py-1 ${urgencyStyles[r.urgency]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold">{r.title}</div>
                    <span className="text-[10px] uppercase tracking-wider opacity-80">{r.urgency}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{r.description}</p>
                  {r.target_segments && r.target_segments.length > 0 && (
                    <div className="text-[10px] mt-1 text-muted-foreground">Segmentos: {r.target_segments.join(", ")}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {data.insights.risks.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Riscos
              </div>
              <ul className="space-y-1">
                {data.insights.risks.map((r, i) => (
                  <li key={i} className="text-[12px] leading-relaxed flex gap-2">
                    <span className="text-destructive">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border">
            Gerado em {new Date(data.generated_at).toLocaleString("pt-BR")} · powered by Lovable AI
          </div>
        </div>
      )}
    </section>
  );
};