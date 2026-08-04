import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ListOrdered } from "lucide-react";
import { ircForSegment, ircLevelClass, ircLevelLabel } from "@/lib/irc";
import type { Segment } from "@/types/domain";

interface Props {
  segments: Segment[];
  rain5d: number;
  limit?: number;
}

export const PriorityList = ({ segments, rain5d, limit = 5 }: Props) => {
  const navigate = useNavigate();

  const rows = useMemo(
    () =>
      segments
        .map(s => ({ s, irc: ircForSegment(s, rain5d) }))
        .sort((a, b) => b.irc.score - a.irc.score)
        .slice(0, limit),
    [segments, rain5d, limit]
  );

  return (
    <section className="bg-surface-lowest rounded-xl p-4 md:p-5 border border-border/40 shadow-card h-full">
      <h3 className="text-[13px] font-semibold tracking-wider uppercase flex items-center gap-2 mb-3">
        <ListOrdered className="h-3.5 w-3.5 text-primary" /> Trechos prioritários
      </h3>
      {rows.length === 0 ? (
        <p className="text-[12px] text-muted-foreground py-6 text-center">Nenhum trecho para priorizar.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map(({ s, irc }, i) => (
            <li key={s.id}>
              <button
                onClick={() => navigate(`/segmento/${s.id}`)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-surface-low transition-smooth group"
              >
                <span className="text-[11px] font-mono text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-semibold truncate">{s.km}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    {s.rodovia ?? "Malha"} · {s.tipo}
                  </span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${ircLevelClass(irc.level)}`}>
                  {ircLevelLabel[irc.level]}
                </span>
                <span className="text-[13px] font-bold tabular-nums w-8 text-right">{irc.score}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};