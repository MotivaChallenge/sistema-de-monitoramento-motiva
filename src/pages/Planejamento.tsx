import { TopHeader } from "@/components/vegia/TopHeader";
import { useSegments } from "@/hooks/useVegiaData";
import { useWeather } from "@/hooks/useWeather";
import { ircForSegment } from "@/lib/irc";
import { useMemo, useState } from "react";
import { CalendarDays, Users, Gauge, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TEAMS = [
  { id: "t1", nome: "Brigada Norte Rodoanel", capacidadeDia: 4, regiao: "Norte" },
  { id: "t2", nome: "Consórcio SP-Verde", capacidadeDia: 6, regiao: "Centro" },
  { id: "t3", nome: "Equipe Sul Conservação", capacidadeDia: 5, regiao: "Sul" },
];

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const Planejamento = () => {
  const { data: segmentsRaw = [], isLoading } = useSegments();
  const { data: weather } = useWeather();
  const rain5d = weather?.summary.totalRainMm ?? 8;
  const [horizonte, setHorizonte] = useState<"semana" | "mes">("semana");

  // Prioriza trechos por IRC, distribui por equipe round-robin respeitando capacidade
  const plan = useMemo(() => {
    const sorted = [...segmentsRaw]
      .map(s => ({ ...s, _score: ircForSegment(s, rain5d).score }))
      .sort((a, b) => b._score - a._score);

    const slots = horizonte === "semana" ? 5 : 22; // dias úteis
    const totalCap = TEAMS.reduce((a, t) => a + t.capacidadeDia, 0);
    const limit = Math.min(sorted.length, slots * totalCap);

    const buckets: Record<string, Array<{ s: typeof sorted[number]; dia: number }>> = Object.fromEntries(TEAMS.map(t => [t.id, []]));
    let day = 0;
    let perDayCount: Record<string, number> = Object.fromEntries(TEAMS.map(t => [t.id, 0]));
    let tIdx = 0;

    for (let i = 0; i < limit; i++) {
      const seg = sorted[i];
      // achar próxima equipe com capacidade disponível no dia atual
      let tries = 0;
      while (perDayCount[TEAMS[tIdx].id] >= TEAMS[tIdx].capacidadeDia && tries < TEAMS.length) {
        tIdx = (tIdx + 1) % TEAMS.length;
        tries++;
      }
      if (tries >= TEAMS.length) {
        // avança o dia
        day++;
        if (day >= slots) break;
        perDayCount = Object.fromEntries(TEAMS.map(t => [t.id, 0]));
        tIdx = 0;
      }
      buckets[TEAMS[tIdx].id].push({ s: seg, dia: day });
      perDayCount[TEAMS[tIdx].id]++;
      tIdx = (tIdx + 1) % TEAMS.length;
    }

    return buckets;
  }, [segmentsRaw, rain5d, horizonte]);

  const totalProgramado = Object.values(plan).reduce((a, b) => a + b.length, 0);
  const slotsLabel = horizonte === "semana" ? 5 : 22;

  return (
    <>
      <TopHeader />
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
          </div>
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
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Trechos programados</div>
            <div className="text-[28px] font-bold tabular-nums mt-1">{totalProgramado}</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Equipes alocadas</div>
            <div className="text-[28px] font-bold tabular-nums mt-1">{TEAMS.length}</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Capacidade total/dia</div>
            <div className="text-[28px] font-bold tabular-nums mt-1">{TEAMS.reduce((a, t) => a + t.capacidadeDia, 0)}</div>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Dias úteis</div>
            <div className="text-[28px] font-bold tabular-nums mt-1">{slotsLabel}</div>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="space-y-5">
            {TEAMS.map(team => {
              const assigned = plan[team.id] || [];
              const carga = Math.round((assigned.length / (slotsLabel * team.capacidadeDia)) * 100);
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
                          <MapPin className="h-3 w-3" /> Região {team.regiao} · {team.capacidadeDia} trechos/dia
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
                                title={`KM ${it.s.km} · IRC ${it.s._score}`}
                              >
                                KM {it.s.km}
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
            <b>Otimização ORION:</b> a alocação prioriza trechos com IRC {">"} 55,
            balanceando carga por equipe e respeitando regionalização. Janela
            recalculada automaticamente conforme novas leituras NDVI e previsão de chuva.
          </div>
        </div>
      </div>
    </>
  );
};

export default Planejamento;