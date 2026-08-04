import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { useFieldTeams, type TeamStatus } from "@/hooks/useVegiaData";
import { Skeleton } from "@/components/ui/skeleton";

const statusLabel: Record<TeamStatus, string> = {
  disponivel: "Disponíveis",
  campo: "Em campo",
  manutencao: "Manutenção",
  afastada: "Afastadas",
};

const statusDot: Record<TeamStatus, string> = {
  disponivel: "bg-primary",
  campo: "bg-tertiary",
  manutencao: "bg-muted-foreground",
  afastada: "bg-destructive",
};

export const TeamsStatus = () => {
  const navigate = useNavigate();
  const { data: teams = [], isLoading } = useFieldTeams();

  const order: TeamStatus[] = ["disponivel", "campo", "manutencao", "afastada"];
  const counts = order.map(s => ({ status: s, count: teams.filter(t => t.status === s).length }));
  const capacidadeDia = teams
    .filter(t => t.status === "disponivel" || t.status === "campo")
    .reduce((a, t) => a + t.capacidade_dia, 0);

  return (
    <section className="bg-surface-lowest rounded-xl p-4 md:p-5 border border-border/40 shadow-card h-full flex flex-col">
      <h3 className="text-[13px] font-semibold tracking-wider uppercase flex items-center gap-2 mb-3">
        <Users className="h-3.5 w-3.5 text-primary" /> Equipes
      </h3>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {counts.map(c => (
              <div key={c.status} className="bg-surface-low rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot[c.status]}`} />
                  {statusLabel[c.status]}
                </div>
                <div className="text-[20px] font-bold tabular-nums leading-tight mt-0.5">{c.count}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-3">
            Capacidade operacional do dia:{" "}
            <span className="font-semibold text-foreground tabular-nums">{capacidadeDia} km</span>
          </div>
        </>
      )}

      <button
        onClick={() => navigate("/equipes")}
        className="w-full mt-3 py-2 rounded-lg border border-border text-[11px] font-semibold tracking-wider uppercase hover:bg-surface-low hover:border-primary/40 transition-smooth"
      >
        Gerenciar equipes
      </button>
    </section>
  );
};