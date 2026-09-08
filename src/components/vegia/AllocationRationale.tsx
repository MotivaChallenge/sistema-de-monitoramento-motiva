import { useMemo, useState } from "react";
import { ChevronDown, HelpCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { FieldTeam } from "@/hooks/useVegiaData";
import { formatKmPrecise } from "@/lib/km";
import { SLA_DAYS } from "@/lib/deadlines";
import { segmentUncertainty } from "@/lib/uncertainty";

export interface PlannedItem {
  s: {
    id: string; km: string; kmStart: number; kmEnd: number; tipo: string;
    altura: number; limite: number; status: string; _score: number; regiao?: string;
    uncertaintyCm?: number | null;
  };
  dia: number;
}

interface Props {
  team: FieldTeam;
  assigned: PlannedItem[];
  otherTeams: FieldTeam[];
  slots: number;
  /** Mapa trecho → equipes que o receberam (para detectar duplicidade). */
  ownersBySegment: Map<string, string[]>;
  teamNames: Map<string, string>;
}

/** Velocidade média de deslocamento e produtividade usadas apenas como estimativa de planejamento. */
const AVG_SPEED_KMH = 60;
const HOURS_PER_KM_ROCADA = 1.5;
const SHIFT_HOURS = 8;

const priorityFromScore = (score: number): keyof typeof SLA_DAYS =>
  score >= 75 ? "critica" : score >= 55 ? "alta" : score >= 35 ? "media" : "baixa";

export const AllocationRationale = ({ team, assigned, otherTeams, slots, ownersBySegment, teamNames }: Props) => {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    const km = assigned.reduce((a, it) => a + Math.max(0.1, it.s.kmEnd - it.s.kmStart), 0);
    const travelKm = assigned.reduce((a, it) => a + Math.abs(it.s.kmStart - Number(team.base_km)), 0);
    const workHours = km * HOURS_PER_KM_ROCADA;
    const travelHours = travelKm / AVG_SPEED_KMH + (assigned.length * Number(team.tempo_resposta_min)) / 60;
    const capacityHours = slots * SHIFT_HOURS;
    const capacityItems = slots * team.capacidade_dia;
    const duplicates = assigned.filter(it => (ownersBySegment.get(it.s.id)?.length ?? 0) > 1);
    return {
      km, travelKm, workHours, travelHours, capacityHours, capacityItems,
      utilizationItems: capacityItems ? Math.round((assigned.length / capacityItems) * 100) : 0,
      utilizationHours: capacityHours ? Math.round(((workHours + travelHours) / capacityHours) * 100) : 0,
      duplicates,
    };
  }, [assigned, team, slots, ownersBySegment]);

  const fmtH = (h: number) => `${h.toFixed(1).replace(".", ",")} h`;

  return (
    <div className="border-t border-border/40">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-surface-low/60 transition-smooth"
      >
        <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-primary">
          <HelpCircle className="h-4 w-4" /> Por que esta alocação?
        </span>
        <span className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
          <span>{assigned.length} trecho(s) · {summary.km.toFixed(1).replace(".", ",")} km</span>
          <span className="hidden sm:inline">· {fmtH(summary.workHours + summary.travelHours)} estimadas</span>
          {summary.duplicates.length > 0 && (
            <span className="inline-flex items-center gap-1 text-destructive font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" /> {summary.duplicates.length} conflito(s)
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          {/* Utilização detalhada */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Trechos / capacidade" value={`${assigned.length} / ${summary.capacityItems}`} sub={`${summary.utilizationItems}% da capacidade (${team.capacidade_dia}/dia × ${slots} dias)`} />
            <Stat label="Extensão a roçar" value={`${summary.km.toFixed(1).replace(".", ",")} km`} sub={`${HOURS_PER_KM_ROCADA} h/km → ${fmtH(summary.workHours)}`} />
            <Stat label="Deslocamento" value={`${summary.travelKm.toFixed(0)} km`} sub={`base KM ${team.base_km} · ${fmtH(summary.travelHours)} incl. ${team.tempo_resposta_min} min/trecho`} />
            <Stat label="Horas / turno" value={`${summary.utilizationHours}%`} sub={`${fmtH(summary.workHours + summary.travelHours)} de ${summary.capacityHours} h (${SHIFT_HOURS} h × ${slots} dias)`} />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Estimativa de planejamento (velocidade média {AVG_SPEED_KMH} km/h, produtividade {HOURS_PER_KM_ROCADA} h/km). Região atendida: <b>{team.regiao}</b> · eficiência cadastrada {team.eficiencia}%.
          </p>

          {/* Justificativa por trecho */}
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[12px] min-w-[720px]">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1.5 pr-3 font-semibold">Trecho</th>
                  <th className="py-1.5 pr-3 font-semibold">IRC</th>
                  <th className="py-1.5 pr-3 font-semibold">Criticidade / altura est.</th>
                  <th className="py-1.5 pr-3 font-semibold">Distância da base</th>
                  <th className="py-1.5 pr-3 font-semibold">Prazo / SLA</th>
                  <th className="py-1.5 pr-3 font-semibold">Por que não outra equipe</th>
                  <th className="py-1.5 font-semibold">Sobreposição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {assigned.slice(0, 12).map(it => {
                  const dist = Math.abs(it.s.kmStart - Number(team.base_km));
                  const travelMin = Math.round((dist / AVG_SPEED_KMH) * 60 + Number(team.tempo_resposta_min));
                  const prio = priorityFromScore(it.s._score);
                  const nearestOther = otherTeams
                    .map(t => ({ t, d: Math.abs(it.s.kmStart - Number(t.base_km)) }))
                    .sort((a, b) => a.d - b.d)[0];
                  const owners = ownersBySegment.get(it.s.id) ?? [];
                  const dup = owners.length > 1;
                  let reason = "Única equipe elegível no filtro atual.";
                  if (nearestOther) {
                    if (nearestOther.t.regiao !== team.regiao) reason = `${nearestOther.t.nome} atende outra região (${nearestOther.t.regiao}).`;
                    else if (nearestOther.d > dist) reason = `${nearestOther.t.nome} está ${(nearestOther.d - dist).toFixed(0)} km mais distante.`;
                    else reason = `${nearestOther.t.nome} está ${(dist - nearestOther.d).toFixed(0)} km mais perto, mas com capacidade do dia ${it.dia + 1} preenchida no rodízio.`;
                  }
                  return (
                    <tr key={it.s.id}>
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">{formatKmPrecise(it.s.kmStart)} <span className="text-muted-foreground font-normal">· {it.s.tipo}</span></td>
                      <td className="py-2 pr-3 tabular-nums font-semibold">{it.s._score}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className="uppercase text-[10px] font-bold tracking-wider">{it.s.status}</span>{" "}
                        <span className="tabular-nums">{it.s.altura} ± {segmentUncertainty({ uncertaintyCm: it.s.uncertaintyCm })} cm</span>
                        <span className="text-muted-foreground"> (limite {it.s.limite})</span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{dist.toFixed(0)} km · ~{travelMin} min</td>
                      <td className="py-2 pr-3 whitespace-nowrap">dia {it.dia + 1} · SLA {SLA_DAYS[prio]} d ({prio})</td>
                      <td className="py-2 pr-3 text-muted-foreground max-w-[240px]">{reason}</td>
                      <td className="py-2">
                        {dup ? (
                          <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5" /> duplicidade com {owners.filter(o => o !== team.id).map(o => teamNames.get(o) ?? o).join(", ")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> exclusivo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {assigned.length > 12 && (
              <p className="text-[11px] text-muted-foreground mt-2">Exibindo 12 de {assigned.length} trechos.</p>
            )}
          </div>

          {summary.duplicates.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-[12px] text-destructive">
              <b>Conflito:</b> {summary.duplicates.length} trecho(s) aparecem em mais de uma equipe. Resolva a duplicidade antes de gerar ordens de serviço.
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground">
              Nenhuma duplicidade: cada trecho está alocado a uma única equipe. Sobreposições de horário entre equipes representam operação simultânea em segmentos diferentes.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="rounded-lg bg-surface-low border border-border/40 p-3">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-[16px] font-bold tabular-nums leading-tight mt-0.5">{value}</div>
    <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{sub}</div>
  </div>
);
