import { TopHeader } from "@/components/vegia/TopHeader";
import { Users, MapPin, Clock, Activity, Plus, Pencil, Trash2 } from "lucide-react";
import { useFieldTeams, TeamStatus, FieldTeam } from "@/hooks/useVegiaData";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_META: Record<TeamStatus, { label: string; bg: string; fg: string; dot: string }> = {
  disponivel: { label: "Disponível", bg: "hsl(var(--turquoise) / 0.12)", fg: "hsl(var(--turquoise))", dot: "hsl(var(--turquoise))" },
  campo: { label: "Em campo", bg: "hsl(var(--primary) / 0.12)", fg: "hsl(var(--primary))", dot: "hsl(var(--primary))" },
  manutencao: { label: "Manutenção", bg: "hsl(var(--tertiary) / 0.15)", fg: "hsl(var(--tertiary))", dot: "hsl(var(--tertiary))" },
  afastada: { label: "Afastada", bg: "hsl(var(--destructive) / 0.12)", fg: "hsl(var(--destructive))", dot: "hsl(var(--destructive))" },
};

type FormState = {
  nome: string;
  regiao: string;
  status: TeamStatus;
  funcionarios: number;
  capacidade_dia: number;
  base_km: number;
  tempo_resposta_min: number;
  eficiencia: number;
};

const emptyForm: FormState = {
  nome: "",
  regiao: "Centro",
  status: "disponivel",
  funcionarios: 4,
  capacidade_dia: 3,
  base_km: 0,
  tempo_resposta_min: 20,
  eficiencia: 80,
};

const Equipes = () => {
  const { data: teams = [], isLoading, isError, refetch } = useFieldTeams();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FieldTeam | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const total = teams.length;
  const disponiveis = teams.filter(t => t.status === "disponivel").length;
  const emCampo = teams.filter(t => t.status === "campo").length;
  const capacidadeDia = teams.filter(t => t.status !== "afastada" && t.status !== "manutencao").reduce((a, t) => a + t.capacidade_dia, 0);
  const eficienciaMedia = teams.length ? Math.round(teams.reduce((a, t) => a + t.eficiencia, 0) / teams.length) : 0;

  const ranking = [...teams].sort((a, b) => b.eficiencia - a.eficiencia);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (t: FieldTeam) => {
    setEditing(t);
    setForm({
      nome: t.nome, regiao: t.regiao, status: t.status,
      funcionarios: t.funcionarios, capacidade_dia: t.capacidade_dia,
      base_km: t.base_km, tempo_resposta_min: t.tempo_resposta_min, eficiencia: t.eficiencia,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const payload = { ...form };
    const { error } = editing
      ? await supabase.from("field_teams").update(payload).eq("id", editing.id)
      : await supabase.from("field_teams").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    toast.success(editing ? "Equipe atualizada" : "Equipe criada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["field_teams"] });
  };

  const remove = async (t: FieldTeam) => {
    if (!confirm(`Excluir equipe "${t.nome}"?`)) return;
    const { error } = await supabase.from("field_teams").delete().eq("id", t.id);
    if (error) { toast.error("Erro ao excluir", { description: error.message }); return; }
    toast.success("Equipe excluída");
    qc.invalidateQueries({ queryKey: ["field_teams"] });
  };

  return (
    <>
      <TopHeader />
      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Equipes operacionais
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">Cadastro, status em tempo real e ranking de eficiência das equipes em campo.</p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova equipe</Button>
          )}
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
                  {canEdit && <th className="text-right px-5 py-3 font-semibold">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading && (
                  <tr><td colSpan={canEdit ? 8 : 7} className="px-5 py-6 text-center text-muted-foreground">Carregando…</td></tr>
                )}
                {isError && (
                  <tr><td colSpan={canEdit ? 8 : 7} className="px-5 py-6 text-center">
                    <button
                      onClick={() => refetch()}
                      className="inline-flex items-center gap-2 text-destructive hover:underline text-[12px] font-semibold"
                    >
                      Falha ao carregar equipes — tentar novamente
                    </button>
                  </td></tr>
                )}
                {!isLoading && teams.length === 0 && (
                  <tr><td colSpan={canEdit ? 8 : 7} className="px-5 py-6 text-center text-muted-foreground">Nenhuma equipe cadastrada.</td></tr>
                )}
                {teams.map(t => {
                  const meta = STATUS_META[t.status];
                  return (
                    <tr key={t.id} className="hover:bg-surface-low/60 transition-smooth">
                      <td className="px-5 py-3 font-semibold">{t.nome}</td>
                      <td className="px-3 py-3 tabular-nums">{t.funcionarios}</td>
                      <td className="px-3 py-3 tabular-nums">{t.capacidade_dia}</td>
                      <td className="px-3 py-3">{t.regiao}</td>
                      <td className="px-3 py-3 tabular-nums">{t.base_km}</td>
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
                      {canEdit && (
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(t)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                            {isAdmin && (
                              <Button size="sm" variant="ghost" onClick={() => remove(t)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            )}
                          </div>
                        </td>
                      )}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar equipe" : "Nova equipe"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Região</Label>
              <Input value={form.regiao} onChange={e => setForm({ ...form, regiao: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: TeamStatus) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_META) as TeamStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Funcionários</Label>
              <Input type="number" min={0} value={form.funcionarios} onChange={e => setForm({ ...form, funcionarios: +e.target.value })} />
            </div>
            <div>
              <Label>Capacidade/dia</Label>
              <Input type="number" min={0} value={form.capacidade_dia} onChange={e => setForm({ ...form, capacidade_dia: +e.target.value })} />
            </div>
            <div>
              <Label>Base (KM)</Label>
              <Input type="number" min={0} step="0.1" value={form.base_km} onChange={e => setForm({ ...form, base_km: +e.target.value })} />
            </div>
            <div>
              <Label>Tempo resposta (min)</Label>
              <Input type="number" min={0} value={form.tempo_resposta_min} onChange={e => setForm({ ...form, tempo_resposta_min: +e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Eficiência (%)</Label>
              <Input type="number" min={0} max={100} value={form.eficiencia} onChange={e => setForm({ ...form, eficiencia: +e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Equipes;