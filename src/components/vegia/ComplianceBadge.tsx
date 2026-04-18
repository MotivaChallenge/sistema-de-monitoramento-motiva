import { Status } from "@/data/mock";

const map: Record<Status, { bg: string; text: string; label: string; dot: string }> = {
  critico:  { bg: "bg-destructive/10", text: "text-destructive", label: "CRÍTICO", dot: "bg-destructive" },
  atencao:  { bg: "bg-tertiary/15",   text: "text-tertiary",    label: "ATENÇÃO", dot: "bg-tertiary" },
  conforme: { bg: "bg-secondary-container", text: "text-secondary-on-container", label: "CONFORME", dot: "bg-[hsl(var(--on-secondary-container))]" },
};

export const ComplianceBadge = ({ status, label }: { status: Status; label?: string }) => {
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label || s.label}
    </span>
  );
};

export const StatusDot = ({ status, label }: { status: Status; label: string }) => {
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-2 text-[13px] ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {label}
    </span>
  );
};
