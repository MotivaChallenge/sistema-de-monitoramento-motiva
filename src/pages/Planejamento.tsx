import { TopHeader } from "@/components/vegia/TopHeader";
import { segmentProvenance } from "@/lib/data-provenance";
import { useSegments, useFieldTeams, FieldTeam } from "@/hooks/useVegiaData";
import { useWeather } from "@/hooks/useWeather";
import { ircForSegment } from "@/lib/irc";
import { useMemo, useState } from "react";
import { CalendarDays, Users, Gauge, MapPin, Loader2, ClipboardPlus, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFilters } from "@/contexts/FiltersContext";
import { HighwaySelect } from "@/components/vegia/HighwaySelect";
import { GlobalFilters } from "@/components/vegia/GlobalFilters";
import { formatKmPrecise } from "@/lib/km";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const priorityFromScore = (score: number): "critica" | "alta" | "media" | "baixa" =>
  score >= 75 ? "critica" : score >= 55 ? "alta" : score >= 35 ? "media" : "baixa";

const addBusinessDays = (base: Date, offset: number): string => {
  const d = new Date(base);
  let added = 0;
  while (added < offset) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
};

const Planejamento = () => {
  const { data: allSegments = [], isLoading } = useSegments();
  const { data: teamsRaw = [], isLoading: teamsLoading } = useFieldTeams();
  const { data: weather } = useWeather();
  const rain5d = weather?.summary.totalRainMm ?? 8;
  const [horizonte, setHorizonte] = useState<"semana" | "mes">("semana");
  const [regiao, setRegiao] = useState<string>("todas");
  const qc = useQueryClient();
  const { matches, rodovia } = useFilters();

  const segmentsRaw = useMemo(
    () => allSegments.filter(s => matches({
      status: s.status, kmStart: s.kmStart, kmEnd: s.kmEnd, rodovia: s.rodovia ?? null,
      text: `${s.km} ${s.tipo} ${s.id}`, ...segmentProvenance(s),
    })),
    [allSegments, matches]
  );

  const teams: FieldTeam[] = useMemo(
    () => teamsRaw
      .filter(t => t.status === "disponivel" || t.status === "campo")
      .filter(t => regiao === "todas" || t.regiao === regiao),
    [teamsRaw, regiao]
  );

  const regioes = useMemo(
    () => Array.from(new Set(teamsRaw.map(t => t.regiao))).sort(),
    [teamsRaw]
  );

  // Prioriza trechos por IRC, distribui por equipe round-robin respeitando capacidade
  const plan = useMemo(() => {
    if (!teams.length) return {} as Record<string, Array<{ s: any; dia: number }>>;
    const sorted = [...segmentsRaw]
      .map(s => ({ ...s, _score: ircForSegment(s, rain5d).score }))
      .sort((a, b) => b._score - a._score);

    const slots = horizonte === "semana" ? 5 : 22; // dias úteis
    const totalCap = teams.reduce((a, t) => a + t.capacidade_dia, 0);
    const limit = Math.min(sorted.length, slots * totalCap);

    const buckets: Record<string, Array<{ s: typeof sorted[number]; dia: number }>> = Object.fromEntries(teams.map(t => [t.id, []]));
    let day = 0;
    let perDayCount: Record<string, number> = Object.fromEntries(teams.map(t => [t.id, 0]));
    let tIdx = 0;

    for (let i = 0; i < limit; i++) {
      const seg = sorted[i];
      // achar próxima equipe com capacidade disponível no dia atual
      let tries = 0;
      while (perDayCount[teams[tIdx].id] >= teams[tIdx].capacidade_dia && tries < teams.length) {
        tIdx = (tIdx + 1) % teams.length;
        tries++;
      }
      if (tries >= teams.length) {
        // avança o dia
        day++;
        if (day >= slots) break;
        perDayCount = Object.fromEntries(teams.map(t => [t.id, 0]));
        tIdx = 0;
      }
      buckets[teams[tIdx].id].push({ s: seg, dia: day });
      perDayCount[teams[tIdx].id]++;
      tIdx = (tIdx + 1) % teams.length;
    }

    return buckets;
  }, [segmentsRaw, rain5d, horizonte, teams]);

  const totalProgramado = Object.values(plan).reduce((a, b) => a + b.length, 0);
  const slotsLabel = horizonte === "semana" ? 5 : 22;

  const generateOS = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const rows: any[] = [];
      const suffix = Date.now().toString(36).toUpperCase().slice(-4);
      let seq = 1;
      for (const [teamId, items] of Object.entries(plan)) {
        for (const it of items) {
          rows.push({
            code: `OS-${suffix}-${String(seq++).padStart(3, "0")}`,
            segment_id: it.s.id,
            team_id: teamId,
            tipo_servico: "rocada",
            priority: priorityFromScore(it.s._score),
            status: "pendente",
            scheduled_for: addBusinessDays(today, it.dia),
          });
        }
      }
      if (!rows.length) throw new Error("Nada para gerar");
      const { error } = await supabase.from("work_orders").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["work_orders"] });
      toast.success("Ordens geradas", { description: `${n} ordens de serviço criadas com base no plano atual.` });
    },
    onError: (e: any) => {
      toast.error("Falha ao gerar OS", { description: e.message ?? "Erro inesperado" });
    },
  });

  return (
    <>
      <TopHeader current="Planejamento" breadcrumb={[{ label: "Rodoanel SP-021", to: "/dashboard" }]} />
      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Planejamento Operacional
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-[640px]">
              Distribuição automática de trechos por equipe baseada em criticidade,
              capacidade diária e região atendida.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Link
                to="/previsoes"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface-lowest text-[12px] font-semibold hover:bg-surface-low transition-smooth"
              >
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Previsões
              </Link>
              <Link
                to="/equipes"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface-lowest text-[12px] font-semibold hover:bg-surface-low transition-smooth"
              >
                <Users className="h-3.5 w-3.5 text-primary" /> Equipes
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HighwaySelect />
            <select
              value={regiao}
              onChange={e => setRegiao(e.target.value)}
              aria-label="Filtrar equipes por região"
              className="h-9 px-3 rounded-lg border border-border bg-surface-lowest text-[12px] font-semibold"
            >
              <option value="todas">Todas as regiões</option>
              {regioes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <GlobalFilters />
            <div className="inline-flex bg-surface-high rounded-md p-0.5">
              {(["semana", "mes"] as const).map(h => (
                <button
                  key={h}
                  onClick={() => setHorizonte(h)}
                  className={`px-4 h-8 rounded text-[12px] font-semibold tracking-wider uppercase transition-smooth ${horizonte === h ? "bg-surface-lowest shadow-sm" : "text-muted-foreground"}`}
                >
                  {h === "semana" ? "Semanal" : "Mensal"}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => generateOS.mutate()}
              disabled={generateOS.isPending || totalProgramado === 0}
              className="h-8"
            >
              {generateOS.isPending
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <ClipboardPlus className="h-3.5 w-3.5 mr-1.5" />}
              Gerar ordens de serviço
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Trechos programados</div>
            <div className="text-[28px] font-bold tabular-nums mt-1">{totalProgramado}</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Equipes alocadas</div>
            <div className="text-[28px] font-bold tabular-nums mt-1">{teams.length}</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Capacidade total/dia</div>
            <div className="text-[28px] font-bold tabular-nums mt-1">{teams.reduce((a, t) => a + t.capacidade_dia, 0)}</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Dias úteis</div>
            <div className="text-[28px] font-bold tabular-nums mt-1">{slotsLabel}</div>
          </div>
        </div>

        {isLoading || teamsLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : teams.length === 0 ? (
          <div className="bg-surface-lowest rounded-xl border border-border/40 p-8 text-center text-[13px] text-muted-foreground">
            Nenhuma equipe disponível cadastrada. Cadastre equipes em <b>Equipes</b> para gerar o planejamento.
          </div>
        ) : (
          <div className="space-y-5">
            {teams.map(team => {
              const assigned = plan[team.id] || [];
              const carga = Math.round((assigned.length / (slotsLabel * team.capacidade_dia)) * 100);
              return (
                <section key={team.id} className="bg-surface-lowest rounded-xl border border-border/40 shadow-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/40 flex flex-wrap items-center justify-between gap-3 bg-gradient-surface">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold">{team.nome}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3 w-3" /> Região {team.regiao} · {team.capacidade_dia} trechos/dia
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Carga</div>
                        <div className="text-[14px] font-bold tabular-nums">{carga}%</div>
                      </div>
                      <div className="w-24 h-2 rounded-full bg-surface-high overflow-hidden">
                        <div
                          className="h-full rounded-full transition-smooth"
                          style={{
                            width: `${Math.min(carga, 100)}%`,
                            background: carga >= 90 ? "hsl(var(--destructive))" : carga >= 70 ? "hsl(var(--tertiary))" : "hsl(var(--primary))",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-11 gap-1 p-3 text-[10px]">
                    {Array.from({ length: slotsLabel }, (_, d) => {
                      const items = assigned.filter(a => a.dia === d);
                      const label = horizonte === "semana" ? DAYS[d % 7] : `D${d + 1}`;
                      return (
                        <div key={d} className="bg-surface-low rounded-lg p-2 min-h-[80px] border border-border/30">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">{label}</div>
                          <div className="space-y-1">
                            {items.slice(0, 4).map(it => (
                              <div
                                key={it.s.id}
                                className="rounded px-1.5 py-0.5 text-[10px] font-semibold truncate"
                                style={{
                                  background: it.s._score >= 75 ? "hsl(var(--destructive) / 0.15)" : it.s._score >= 55 ? "hsl(var(--tertiary) / 0.15)" : "hsl(var(--primary) / 0.12)",
                                  color: it.s._score >= 75 ? "hsl(var(--destructive))" : it.s._score >= 55 ? "hsl(var(--tertiary))" : "hsl(var(--primary))",
                                }}
                                title={`${formatKmPrecise(it.s.kmStart)} · ${it.s.tipo} · IRC ${it.s._score}`}
                              >
                                {formatKmPrecise(it.s.kmStart).replace(/^km\s/, "")}
                              </div>
                            ))}
                            {items.length > 4 && (
                              <div className="text-[10px] text-muted-foreground">+{items.length - 4}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className="bg-secondary-container/40 border border-secondary-container rounded-xl p-4 text-[12px] text-secondary-on-container flex items-start gap-3">
          <Gauge className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <b>Otimização Motiva:</b> a alocação prioriza trechos com IRC {">"} 55,
            balanceando carga por equipe e respeitando regionalização. Janela
            recalculada automaticamente conforme novas leituras NDVI e previsão de chuva.
          </div>
        </div>
      </div>
    </>
  );
};

export default Planejamento;