import type { WorkOrder, WorkOrderPriority } from "@/hooks/useVegiaData";

export type DueState = "atrasada" | "hoje" | "futura" | "sem_prazo" | "encerrada";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Diferença em dias inteiros (positivo = prazo já passou). */
export const daysOverdue = (scheduledFor: string | null | undefined, now = new Date()): number | null => {
  if (!scheduledFor) return null;
  const due = startOfDay(new Date(`${scheduledFor}T00:00:00`));
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((startOfDay(now).getTime() - due.getTime()) / 86_400_000);
};

export const dueState = (o: Pick<WorkOrder, "status" | "scheduled_for">, now = new Date()): DueState => {
  if (o.status === "concluida" || o.status === "cancelada") return "encerrada";
  const d = daysOverdue(o.scheduled_for, now);
  if (d === null) return "sem_prazo";
  if (d > 0) return "atrasada";
  if (d === 0) return "hoje";
  return "futura";
};

export const isOverdue = (o: Pick<WorkOrder, "status" | "scheduled_for">, now = new Date()) =>
  dueState(o, now) === "atrasada";

/** SLA contratual (dias) por prioridade — referência interna de planejamento. */
export const SLA_DAYS: Record<WorkOrderPriority, number> = {
  critica: 2,
  alta: 5,
  media: 10,
  baixa: 20,
};

export const DUE_META: Record<DueState, { label: string; className: string }> = {
  atrasada: { label: "ATRASADA", className: "bg-destructive/12 text-destructive border-destructive/30" },
  hoje: { label: "VENCE HOJE", className: "bg-tertiary/12 text-tertiary border-tertiary/30" },
  futura: { label: "NO PRAZO", className: "bg-primary/10 text-primary border-primary/25" },
  sem_prazo: { label: "SEM PRAZO", className: "bg-muted text-muted-foreground border-border" },
  encerrada: { label: "ENCERRADA", className: "bg-muted text-muted-foreground border-border" },
};

/** Base é considerada histórica/demonstrativa quando a maioria dos prazos está a mais de 60 dias no passado. */
export const looksLikeDemoBase = (orders: Pick<WorkOrder, "scheduled_for">[], now = new Date()) => {
  const withDate = orders.filter(o => o.scheduled_for);
  if (withDate.length < 3) return false;
  const old = withDate.filter(o => (daysOverdue(o.scheduled_for, now) ?? 0) > 60).length;
  return old / withDate.length > 0.5;
};
