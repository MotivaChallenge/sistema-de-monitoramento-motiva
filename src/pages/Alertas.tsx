import { useMemo } from "react";
import { TopHeader } from "@/components/vegia/TopHeader";
import { GlobalFilters } from "@/components/vegia/GlobalFilters";
import { HighwaySelect } from "@/components/vegia/HighwaySelect";
import { Input } from "@/components/ui/input";
import { useAlertsFeed, markAllSeen } from "@/hooks/useAlertsFeed";
import { useFilters } from "@/contexts/FiltersContext";
import { ComplianceBadge } from "@/components/vegia/ComplianceBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/vegia/QueryErrorState";
import { useNavigate } from "react-router-dom";
import { BellRing, CheckCheck, Search } from "lucide-react";
import { formatKmPrecise } from "@/lib/km";
import { useEffect } from "react";

const Alertas = () => {
  const { data: feed = [], isLoading, isError, refetch } = useAlertsFeed();
  const { matches, search, setSearch } = useFilters();
  const navigate = useNavigate();

  const items = useMemo(
    () => feed.filter(a =>
      matches({
        status: a.status,
        kmStart: a.kmStart,
        rodovia: a.rodovia,
        text: `${a.km} ${a.message} ${a.rodovia ?? ""}`,
      })
    ),
    [feed, matches]
  );

  useEffect(() => { markAllSeen(); }, [feed.length]);

  const counts = {
    critico: items.filter(i => i.status === "critico").length,
    atencao: items.filter(i => i.status === "atencao").length,
    conforme: items.filter(i => i.status === "conforme").length,
  };

  return (
    <>
      <TopHeader breadcrumb={[{ label: "RODOANEL SP-021", to: "/dashboard" }]} current="Alertas" />
      <section className="px-6 pb-10 max-w-[1400px] mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">Central de alertas</h1>
            <p className="text-sm text-muted-foreground">Eventos em tempo real dos trechos monitorados</p>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">{counts.critico} críticos</span>
            <span className="px-2.5 py-1 rounded-full bg-tertiary/15 text-tertiary font-semibold">{counts.atencao} atenção</span>
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">{counts.conforme} conformes</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-[320px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por KM ou mensagem…"
              aria-label="Buscar alertas"
              className="pl-8 h-9 text-[13px]"
            />
          </div>
          <HighwaySelect />
          <GlobalFilters showSearch={false} />
        </div>

        <div className="rounded-xl border border-border bg-surface-low overflow-hidden">
          {isError ? (
            <QueryErrorState onRetry={() => refetch()} message="Não conseguimos carregar os alertas em tempo real." />
          ) : isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 flex flex-col items-center text-center text-muted-foreground gap-2">
              <CheckCheck className="h-8 w-8 text-primary" />
              <p className="font-medium text-foreground">Nenhum alerta para os filtros atuais</p>
              <p className="text-sm">Tudo tranquilo no momento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map(a => (
                <li key={a.id}>
                  <button
                    onClick={() => navigate(`/segmento/${a.segmentId}`)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-high transition-colors"
                  >
                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      a.status === "critico" ? "bg-destructive/15 text-destructive" :
                      a.status === "atencao" ? "bg-tertiary/15 text-tertiary" :
                      "bg-primary/15 text-primary"
                    }`}>
                      <BellRing className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-[14px] truncate">
                          {a.rodovia ? `${a.rodovia} · ` : ""}{formatKmPrecise(a.kmStart)}
                        </span>
                        <ComplianceBadge status={a.status} />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{a.message}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {new Date(a.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
};

export default Alertas;
