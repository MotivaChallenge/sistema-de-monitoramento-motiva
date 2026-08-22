import { TopHeader } from "@/components/vegia/TopHeader";
import { ConfirmationDialog } from "@/components/vegia/ConfirmationDialog";
import { logAudit } from "@/lib/audit";
import { ClipboardList, Plus, Pencil, Trash2, CheckCircle2, Search, X, Loader2 } from "lucide-react";
import { useFieldTeams, useWorkOrders, WorkOrder, WorkOrderPriority, WorkOrderStatus } from "@/hooks/useVegiaData";
import { useSegments } from "@/hooks/useVegiaData";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateBR } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatKmPrecise } from "@/lib/km";

const STATUS_META: Record<WorkOrderStatus, { label: string; bg: string; fg: string }> = {
  pendente: { label: "Pendente", bg: "hsl(var(--muted) / 0.6)", fg: "hsl(var(--muted-foreground))" },
  em_andamento: { label: "Em andamento", bg: "hsl(var(--primary) / 0.12)", fg: "hsl(var(--primary))" },
  concluida: { label: "Concluída", bg: "hsl(var(--turquoise) / 0.12)", fg: "hsl(var(--turquoise))" },
  cancelada: { label: "Cancelada", bg: "hsl(var(--destructive) / 0.12)", fg: "hsl(var(--destructive))" },
};
const PRIORITY_META: Record<WorkOrderPriority, { label: string; fg: string }> = {
  baixa: { label: "Baixa", fg: "hsl(var(--muted-foreground))" },
  media: { label: "Média", fg: "hsl(var(--primary))" },
  alta: { label: "Alta", fg: "hsl(var(--tertiary))" },
  critica: { label: "Crítica", fg: "hsl(var(--destructive))" },
};

type FormState = {
  code: string;
  segment_id: string;
  team_id: string | "none";
  tipo_servico: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  scheduled_for: string;
  notes: string;
};

const emptyForm: FormState = {
  code: "",
  segment_id: "",
  team_id: "none",
  tipo_servico: "rocada",
  priority: "media",
  status: "pendente",
  scheduled_for: "",
  notes: "",
};

const nextCode = () => `OS-${Date.now().toString(36).toUpperCase().slice(-6)}`;

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const OrdensServico = () => {
  const { data: allOrders = [], isLoading, isError, refetch } = useWorkOrders();
  const { data: teams = [] } = useFieldTeams();
  const { data: segments = [] } = useSegments();
  const { canEdit, isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WorkOrder | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtros específicos desta tela
  const [fStatus, setFStatus] = useState<WorkOrderStatus | "todos">("todos");
  const [fPriority, setFPriority] = useState<WorkOrderPriority | "todas">("todas");
  const [fTeam, setFTeam] = useState<string>("todas");
  const [fSearch, setFSearch] = useState("");

  const segMap = new Map(segments.map(s => [s.id, s]));
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const orders = useMemo(() => {
    const q = fSearch.trim().toLowerCase();
    return allOrders.filter(o => {
      if (fStatus !== "todos" && o.status !== fStatus) return false;
      if (fPriority !== "todas" && o.priority !== fPriority) return false;
      if (fTeam !== "todas" && (o.team_id ?? "sem") !== fTeam) return false;
      if (q) {
        const seg = segMap.get(o.segment_id);
        const hay = `${o.code} ${o.tipo_servico} ${seg?.km ?? ""} ${seg?.tipo ?? ""} ${seg?.rodovia ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allOrders, fStatus, fPriority, fTeam, fSearch, segments]);

  const filtersActive =
    fStatus !== "todos" || fPriority !== "todas" || fTeam !== "todas" || fSearch.trim() !== "";
  const clearFilters = () => { setFStatus("todos"); setFPriority("todas"); setFTeam("todas"); setFSearch(""); };

  const kpis = {
    total: allOrders.length,
    pendentes: allOrders.filter(o => o.status === "pendente").length,
    andamento: allOrders.filter(o => o.status === "em_andamento").length,
    concluidas: allOrders.filter(o => o.status === "concluida").length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, code: nextCode(), segment_id: segments[0]?.id ?? "" });
    setOpen(true);
  };

  // Atalho "Nova OS" da sidebar (/ordens?new=1)
  useEffect(() => {
    if (searchParams.get("new") === "1" && canEdit) {
      openCreate();
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canEdit, segments.length]);
  const openEdit = (o: WorkOrder) => {
    setEditing(o);
    setForm({
      code: o.code,
      segment_id: o.segment_id,
      team_id: o.team_id ?? "none",
      tipo_servico: o.tipo_servico,
      priority: o.priority,
      status: o.status,
      scheduled_for: o.scheduled_for ?? "",
      notes: o.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.segment_id) { toast.error("Código e trecho são obrigatórios"); return; }
    setSaving(true);
    const payload: any = {
      code: form.code.trim(),
      segment_id: form.segment_id,
      team_id: form.team_id === "none" ? null : form.team_id,
      tipo_servico: form.tipo_servico,
      priority: form.priority,
      status: form.status,
      scheduled_for: form.scheduled_for || null,
      notes: form.notes || null,
    };
    if (!editing) payload.created_by = user?.id ?? null;
    const before = editing ? { ...editing } : null;
    const { error } = editing
      ? await supabase.from("work_orders").update(payload).eq("id", editing.id)
      : await supabase.from("work_orders").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    toast.success(editing ? "OS atualizada" : "OS criada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["work_orders"] });
    logAudit({
      action: editing ? "work_order.update" : "work_order.create",
      entity: "work_orders",
      entityId: editing?.id ?? payload.code,
      before: before,
      after: payload,
      reason: editing ? "Edição via interface" : "Criação via interface",
    });
  };

  const askRemove = (o: WorkOrder) => setDeleting(o);
  const remove = async () => {
    if (!deleting) return;
    const o = deleting;
    const { error } = await supabase.from("work_orders").delete().eq("id", o.id);
    setDeleting(null);
    if (error) { toast.error("Erro ao excluir", { description: error.message }); return; }
    toast.success("OS excluída");
    qc.invalidateQueries({ queryKey: ["work_orders"] });
    logAudit({
      action: "work_order.delete",
      entity: "work_orders",
      entityId: o.id,
      before: { ...o },
      reason: "Exclusão via interface",
    });
  };

  const complete = async (o: WorkOrder) => {
    setCompletingId(o.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("work_orders")
      .update({
        status: "concluida",
        completed_at: now,
        started_at: o.started_at ?? now,
      })
      .eq("id", o.id);
    setCompletingId(null);
    if (error) { toast.error("Não foi possível concluir a OS", { description: error.message }); return; }
    const seg = segMap.get(o.segment_id);
    toast.success(`OS ${o.code} concluída`, {
      description: `${seg ? `${seg.km} · ` : ""}Finalizada em ${fmtDateTime(now)}.`,
    });
    qc.invalidateQueries({ queryKey: ["work_orders"] });
  };

  return (
    <>
      <TopHeader current="Ordens de Serviço" breadcrumb={[{ label: "Rodoanel SP-021", to: "/dashboard" }]} />
      <div className="px-4 md:px-8 lg:px-10 pt-2 pb-12 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Ordens de serviço
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">Emissão, atribuição e acompanhamento de OS de roçada e manutenção.</p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova OS</Button>
          )}
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {[
            { label: "Total", value: kpis.total },
            { label: "Pendentes", value: kpis.pendentes },
            { label: "Em andamento", value: kpis.andamento },
            { label: "Concluídas", value: kpis.concluidas },
          ].map(k => (
            <div key={k.label} className="bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card hover-lift">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{k.label}</div>
              <div className="text-[28px] font-bold tabular-nums">{k.value}</div>
            </div>
          ))}
        </div>

        <section className="bg-surface-lowest rounded-xl border border-border/40 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold tracking-wide uppercase">Ordens de serviço</h2>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {orders.length} de {allOrders.length} ordens
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-low">
                {([
                  { v: "todos", label: "Todas" },
                  { v: "pendente", label: `Pendentes (${kpis.pendentes})` },
                  { v: "em_andamento", label: `Em execução (${kpis.andamento})` },
                  { v: "concluida", label: `Concluídas (${kpis.concluidas})` },
                ] as const).map(t => (
                  <button
                    key={t.v}
                    onClick={() => setFStatus(t.v as WorkOrderStatus | "todos")}
                    aria-pressed={fStatus === t.v}
                    className={`px-3 h-7 rounded-md text-[12px] font-semibold transition-smooth ${
                      fStatus === t.v
                        ? "bg-surface-lowest text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative min-w-[200px] flex-1 max-w-[280px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={fSearch}
                  onChange={e => setFSearch(e.target.value)}
                  placeholder="Buscar por código, KM ou serviço…"
                  aria-label="Buscar ordens de serviço"
                  className="pl-8 h-9 text-[13px]"
                />
              </div>
              <Select value={fStatus} onValueChange={(v: any) => setFStatus(v)}>
                <SelectTrigger className="h-9 w-[160px] text-[12px]" aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {(Object.keys(STATUS_META) as WorkOrderStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fPriority} onValueChange={(v: any) => setFPriority(v)}>
                <SelectTrigger className="h-9 w-[150px] text-[12px]" aria-label="Filtrar por prioridade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Toda prioridade</SelectItem>
                  {(Object.keys(PRIORITY_META) as WorkOrderPriority[]).map(p => (
                    <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fTeam} onValueChange={setFTeam}>
                <SelectTrigger className="h-9 w-[170px] text-[12px]" aria-label="Filtrar por equipe"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as equipes</SelectItem>
                  <SelectItem value="sem">Sem atribuição</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-[12px]">
                  <X className="h-3.5 w-3.5" /> Limpar
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[880px]">
              <thead className="bg-surface-low text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Código</th>
                  <th className="text-left px-3 py-3 font-semibold">Trecho / localização</th>
                  <th className="text-left px-3 py-3 font-semibold">Serviço</th>
                  <th className="text-left px-3 py-3 font-semibold">Equipe</th>
                  <th className="text-left px-3 py-3 font-semibold">Prioridade</th>
                  <th className="text-left px-3 py-3 font-semibold">Prazo</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  {canEdit && <th className="text-right px-5 py-3 font-semibold">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading && <tr><td colSpan={8} className="px-5 py-6 text-center text-muted-foreground">Carregando…</td></tr>}
                {isError && <tr><td colSpan={8} className="px-5 py-6 text-center">
                  <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 text-destructive hover:underline text-[12px] font-semibold"
                  >Falha ao carregar ordens de serviço — tentar novamente</button>
                </td></tr>}
                {!isLoading && !isError && orders.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-6 text-center text-muted-foreground">
                    {filtersActive ? "Nenhuma OS encontrada para os filtros atuais." : "Nenhuma OS emitida."}
                  </td></tr>
                )}
                {orders.map(o => {
                  const seg = segMap.get(o.segment_id);
                  const team = o.team_id ? teamMap.get(o.team_id) : null;
                  const sm = STATUS_META[o.status];
                  const pm = PRIORITY_META[o.priority];
                  const done = o.status === "concluida" || o.status === "cancelada";
                  return (
                    <tr key={o.id} className={`hover:bg-surface-low/60 transition-smooth ${o.status === "concluida" ? "opacity-70" : ""}`}>
                      <td className="px-5 py-3 font-mono text-[12px] font-semibold">{o.code}</td>
                      <td className="px-3 py-3">
                        {seg ? (
                          <div className="leading-tight">
                            <div className="font-medium">{formatKmPrecise(seg.kmStart)} — {formatKmPrecise(seg.kmEnd)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {seg.rodovia ? `${seg.rodovia} · ` : ""}{seg.tipo}
                            </div>
                          </div>
                        ) : o.segment_id}
                      </td>
                      <td className="px-3 py-3 capitalize">{o.tipo_servico}</td>
                      <td className="px-3 py-3">{team?.nome ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-3"><span className="font-semibold" style={{ color: pm.fg }}>{pm.label}</span></td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">{o.scheduled_for ? formatDateBR(o.scheduled_for) : "—"}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: sm.bg, color: sm.fg }}>
                          {o.status === "concluida" && <CheckCircle2 className="h-3 w-3" />}
                          {sm.label}
                        </span>
                        {o.completed_at && (
                          <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                            Finalizada em {fmtDateTime(o.completed_at)}
                          </div>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex gap-1">
                            {!done && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => complete(o)}
                                disabled={completingId === o.id}
                                className="gap-1.5 text-turquoise hover:text-turquoise"
                                aria-label={`Concluir ordem ${o.code}`}
                              >
                                {completingId === o.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <CheckCircle2 className="h-4 w-4" />}
                                <span className="hidden lg:inline text-[12px] font-semibold">Concluir</span>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => openEdit(o)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                            {isAdmin && <Button size="sm" variant="ghost" onClick={() => remove(o)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
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
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar OS" : "Nova ordem de serviço"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de serviço</Label>
              <Input value={form.tipo_servico} onChange={e => setForm({ ...form, tipo_servico: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Trecho</Label>
              <Select value={form.segment_id} onValueChange={v => setForm({ ...form, segment_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um trecho" /></SelectTrigger>
                <SelectContent>
                  {segments.map(s => <SelectItem key={s.id} value={s.id}>{s.km} · {s.tipo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Equipe atribuída</Label>
              <Select value={form.team_id} onValueChange={v => setForm({ ...form, team_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem atribuição</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v: WorkOrderPriority) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_META) as WorkOrderPriority[]).map(p => (
                    <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: WorkOrderStatus) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_META) as WorkOrderStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Prazo</Label>
              <Input type="date" value={form.scheduled_for} onChange={e => setForm({ ...form, scheduled_for: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
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

export default OrdensServico;