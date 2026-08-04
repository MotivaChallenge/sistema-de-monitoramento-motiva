import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, MapPin, RefreshCw, Sparkles, Users } from "lucide-react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TopHeader } from "@/components/vegia/TopHeader";
import { AutoCarousel } from "@/components/dashboard/AutoCarousel";
import { StatisticCard } from "@/components/dashboard/StatisticCard";
import { InfoBanner } from "@/components/dashboard/InfoBanner";
import { DashboardMap } from "@/components/dashboard/DashboardMap";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/vegia/QueryErrorState";
import { criticalityLevel, useDashboardData, type SegmentPoint } from "@/hooks/useDashboardData";
import { recommendationsFor } from "@/mocks/dashboard";

const DEFAULT_HIGHWAY = "SP-021";

const Dashboard = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const [rodovia, setRodovia] = useState(DEFAULT_HIGHWAY);
  const [selected, setSelected] = useState<SegmentPoint | null>(null);
  const lastClicked = useRef<string | null>(null);

  const {
    highways, points, highlights, counts, kmCoverage,
    avgCriticality, rain5d, teamsAvailable, teamsCapacity, isLoading, isError,
  } = useDashboardData(rodovia);

  const polyline = useMemo<[number, number][]>(
    () => points.map(p => [p.lat, p.lng] as [number, number]),
    [points]
  );

  const active = selected?.segment;
  const criticidade = active ? criticalityLevel(active, rain5d) : avgCriticality;
  const local = active ? `${active.kmStart} km — ${active.kmEnd} km` : kmCoverage ? `0 km — ${kmCoverage} km` : "—";

  /** 1º clique seleciona o trecho; 2º clique no mesmo ponto abre o detalhe. */
  const handleSelect = (p: SegmentPoint) => {
    if (lastClicked.current === p.segment.id) {
      navigate(`/segmento/${p.segment.id}`);
      return;
    }
    lastClicked.current = p.segment.id;
    setSelected(p);
  };

  const recommendations = recommendationsFor(active?.status);

  return (
    <>
      <TopHeader
        showStatusBadges
        showLastReading
        rightSlot={
          <>
            <select
              aria-label="Selecionar rodovia"
              value={rodovia}
              onChange={e => { setRodovia(e.target.value); setSelected(null); lastClicked.current = null; }}
              className="h-9 rounded-lg bg-surface-lowest border border-border px-2 text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {highways.map((h: any) => (
                <option key={h.code} value={h.code}>{h.code} · {h.nome}</option>
              ))}
            </select>
            <button
              onClick={async () => {
                await qc.invalidateQueries();
                toast.success("Dados atualizados", { description: "Leituras sincronizadas." });
              }}
              disabled={fetching > 0}
              aria-label="Atualizar dados"
              className="ml-1 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${fetching > 0 ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Atualizar</span> Dados
            </button>
          </>
        }
      />

      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-6">
        {isError && <QueryErrorState onRetry={() => qc.invalidateQueries()} />}

        {/* 1 — Situação geral */}
        {isLoading ? (
          <Skeleton className="h-[112px] w-full rounded-xl" />
        ) : (
          <AutoCarousel
            ariaLabel="Situação geral dos trechos"
            interval={5000}
            slides={highlights.map(s => (
              <InfoBanner
                key={s.id}
                status={s.status}
                local={`${s.rodovia ?? rodovia} · Km ${s.kmStart}`}
                title={`${s.km} — ${s.tipo}`}
                detail={s.insight ?? `Altura ${s.altura} cm (limite ${s.limite} cm) · NDVI ${s.ndvi.toFixed(2).replace(".", ",")}`}
                meta={`Última roçada ${s.ultimaRocada}`}
                onClick={() => navigate(`/segmento/${s.id}`)}
              />
            ))}
          />
        )}

        {/* 2, 3, 4 — Equipes, criticidade e local */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <StatisticCard
            icon={Users}
            label="Equipes"
            value={`${teamsAvailable} / ${teamsCapacity}`}
            hint="Disponíveis para deslocamento"
            tone="positive"
            onClick={() => navigate("/equipes")}
          />
          <StatisticCard
            icon={AlertTriangle}
            label="Criticidade"
            value={String(criticidade)}
            suffix="/ 5"
            hint={active ? `Trecho ${active.km}` : `Média da malha · ${counts.critico} críticos`}
            tone={criticidade >= 4 ? "critical" : criticidade === 3 ? "warning" : "positive"}
            animateKey={`${criticidade}-${active?.id ?? "all"}`}
            onClick={() => navigate("/alertas")}
          />
          <StatisticCard
            icon={MapPin}
            label="Local"
            value={local}
            hint={active ? "Trecho selecionado no mapa" : "Selecione um ponto no mapa"}
            animateKey={local}
          />
        </div>

        {/* 5 — Mapa */}
        <DashboardMap
          points={points}
          polyline={polyline}
          selectedId={active?.id}
          loading={isLoading}
          onSelect={handleSelect}
        />

        {/* 6 — Recomendações da IA */}
        <div>
          <h2 className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Recomendações da IA
          </h2>
          <AutoCarousel
            ariaLabel="Recomendações geradas por inteligência artificial"
            interval={6000}
            slides={recommendations.map(r => (
              <InfoBanner
                key={r.id}
                status={r.tone}
                local="Sugestão automática"
                title={r.title}
                detail={r.detail}
              />
            ))}
          />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
