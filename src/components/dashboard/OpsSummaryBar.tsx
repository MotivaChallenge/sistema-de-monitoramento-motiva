import { Clock, Gauge, Radar, ShieldAlert } from "lucide-react";

interface Props {
  lastUpdate: Date;
  monitoredPct: number;
  coverageKm: number;
  criticos: number;
  activeAlerts: number;
}

const Item = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "danger" | "warning";
}) => (
  <div className="flex items-center gap-2 min-w-0">
    <Icon
      className={`h-3.5 w-3.5 shrink-0 ${
        tone === "danger" ? "text-destructive" : tone === "warning" ? "text-tertiary" : "text-primary"
      }`}
    />
    <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
    <span className="text-[12px] font-semibold tabular-nums truncate">{value}</span>
  </div>
);

export const OpsSummaryBar = ({ lastUpdate, monitoredPct, coverageKm, criticos, activeAlerts }: Props) => (
  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-surface-lowest border border-border/40 rounded-xl px-4 py-2.5 shadow-card">
    <Item
      icon={Clock}
      label="Atualizado"
      value={lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    />
    <Item icon={Radar} label="Malha monitorada" value={`${monitoredPct}% · ${coverageKm.toFixed(1).replace(".", ",")} km`} />
    <Item icon={ShieldAlert} label="Ocorrências críticas" value={String(criticos)} tone={criticos > 0 ? "danger" : undefined} />
    <Item icon={Gauge} label="Alertas ativos" value={String(activeAlerts)} tone={activeAlerts > 0 ? "warning" : undefined} />
  </div>
);