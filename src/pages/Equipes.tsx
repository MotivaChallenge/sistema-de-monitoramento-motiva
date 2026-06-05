import { TopHeader } from "@/components/vegia/TopHeader";
import { Users, MapPin, Clock, Activity } from "lucide-react";

type Status = "disponivel" | "campo" | "manutencao" | "afastada";

const STATUS_META: Record<Status, { label: string; bg: string; fg: string; dot: string }> = {
  disponivel: { label: "Disponível", bg: "hsl(var(--turquoise) / 0.12)", fg: "hsl(var(--turquoise))", dot: "hsl(var(--turquoise))" },
  campo: { label: "Em campo", bg: "hsl(var(--primary) / 0.12)", fg: "hsl(var(--primary))", dot: "hsl(var(--primary))" },
  manutencao: { label: "Manutenção", bg: "hsl(var(--tertiary) / 0.15)", fg: "hsl(var(--tertiary))", dot: "hsl(var(--tertiary))" },
  afastada: { label: "Afastada", bg: "hsl(var(--destructive) / 0.12)", fg: "hsl(var(--destructive))", dot: "hsl(var(--destructive))" },
};

const TEAMS = [
  { id: "t1", nome: "Brigada Norte Rodoanel", funcionarios: 6, capacidadeDia: 4, regiao: "Norte", status: "campo" as Status, baseKm: 5, eficiencia: 92 },
  { id: "t2", nome: "Consórcio SP-Verde", funcionarios: 9, capacidadeDia: 6, regiao: "Centro", status: "disponivel" as Status, baseKm: 12, eficiencia: 88 },
  { id: "t3", nome: "Equipe Sul Conservação", funcionarios: 7, capacidadeDia: 5, regiao: "Sul", status: "campo" as Status, baseKm: 24, eficiencia: 85 },
  { id: "t4", nome: "Brigada Leste", funcionarios: 5, capacidadeDia: 3, regiao: "Leste", status: "manutencao" as Status, baseKm: 38, eficiencia: 79 },
  { id: "t5", nome: "Equipe Oeste Reserva", funcionarios: 4, capacidadeDia: 3, regiao: "Oeste", status: "afastada" as Status, baseKm: 52, eficiencia: 81 },
];

const Equipes = () => {
  const total = TEAMS.length;
  const disponiveis = TEAMS.filter(t => t.status === "disponivel").length;
  const emCampo = TEAMS.filter(t => t.status === "campo").length;
  const capacidadeDia = TEAMS.filter(t => t.status !== "afastada" && t.status !== "manutencao").reduce((a, t) => a + t.capacidadeDia, 0);
  const eficienciaMedia = Math.round(TEAMS.reduce((a, t) => a + t.eficiencia, 0) / TEAMS.length);

  const ranking = [...TEAMS].sort((a, b) => b.eficiencia - a.eficiencia);

  return (
    <>
      <TopHeader />
      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-6">
        <header>
          <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Equipes operacionais
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">Cadastro, status em tempo real e ranking de eficiência das equipes em campo.</p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {[
            { label: "Total de equipes", value: total, icon: Users },
            { label: "Disponíveis agora", value: disponiveis, icon: Activity },
            { label: "Em campo", value: emCampo, icon: MapPin },
            { label: "Capacidade/dia", value: capacidadeDia, icon: Clock },
          ].map(k => (
            <div key={k.label} className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card hover-lift">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</span>
                <k.icon className="h-4 w-4 text-primary-glow" />
              </div>
              <div className="text-[28px] font-bold tabular-nums">{k.value}</div>
            </div>
          ))}
        </div>

        <section className="bg-surface-lowest rounded-xl border border-border/40 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold tracking-wide uppercase">Cadastro de equipes</h2>
            <span className="text-[11px] text-muted-foreground">Eficiência média da operação: <b className="text-foreground">{eficienciaMedia}%</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-low text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Equipe</th>
                  <th className="text-left px-3 py-3 font-semibold">Funcionários</th>
                  <th className="text-left px-3 py-3 font-semibold">Capacidade/dia</th>
                  <th className="text-left px-3 py-3 font-semibold">Região</th>
                  <th className="text-left px-3 py-3 font-semibold">Base (KM)</th>
                  <th className="text-left px-3 py-3 font-semibold">Eficiência</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {TEAMS.map(t => {
                  const meta = STATUS_META[t.status];
                  return (
                    <tr key={t.id} className="hover:bg-surface-low/60 transition-smooth">
                      <td className="px-5 py-3 font-semibold">{t.nome}</td>
                      <td className="px-3 py-3 tabular-nums">{t.funcionarios}</td>
                      <td className="px-3 py-3 tabular-nums">{t.capacidadeDia}</td>
                      <td className="px-3 py-3">{t.regiao}</td>
                      <td className="px-3 py-3 tabular-nums">{t.baseKm}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-surface-high overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${t.eficiencia}%` }} />
                          </div>
                          <span className="text-[12px] font-semibold tabular-nums">{t.eficiencia}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: meta.bg, color: meta.fg }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card">
          <h2 className="text-[14px] font-semibold tracking-wide uppercase mb-4">Ranking de eficiência</h2>
          <div className="space-y-3">
            {ranking.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{t.nome}</div>
                  <div className="h-1.5 mt-1.5 rounded-full bg-surface-high overflow-hidden">
                    <div className="h-full bg-gradient-primary rounded-full transition-smooth" style={{ width: `${t.eficiencia}%` }} />
                  </div>
                </div>
                <span className="text-[14px] font-bold tabular-nums w-12 text-right">{t.eficiencia}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default Equipes;