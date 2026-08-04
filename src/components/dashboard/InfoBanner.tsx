import { cn } from "@/lib/utils";
import type { Status } from "@/types/domain";

const statusLabel: Record<Status, string> = {
  critico: "Crítico",
  atencao: "Atenção",
  conforme: "Normal",
};

const statusStyles: Record<Status, string> = {
  critico: "bg-destructive/10 text-destructive border-destructive/30",
  atencao: "bg-tertiary/10 text-tertiary border-tertiary/30",
  conforme: "bg-turquoise/10 text-turquoise border-turquoise/30",
};

const accent: Record<Status, string> = {
  critico: "bg-destructive",
  atencao: "bg-tertiary",
  conforme: "bg-turquoise",
};

type Props = {
  status: Status;
  local: string;
  title: string;
  detail?: string;
  meta?: string;
  onClick?: () => void;
};

export const InfoBanner = ({ status, local, title, detail, meta, onClick }: Props) => (
  <div
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={e => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }}
    className={cn(
      "relative flex items-center gap-5 bg-surface-lowest border border-border/50 rounded-xl pl-12 pr-12 py-6 md:py-7 overflow-hidden",
      onClick && "cursor-pointer transition-smooth hover:border-primary/40 hover:shadow-elegant focus-visible:ring-2 focus-visible:ring-primary/50 outline-none"
    )}
  >
    <span className={cn("absolute left-0 top-0 h-full w-1.5", accent[status])} aria-hidden />
    <div className="min-w-0 flex-1 pl-2">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{local}</span>
        <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border", statusStyles[status])}>
          {statusLabel[status]}
        </span>
      </div>
      <h3 className="text-[16px] md:text-[18px] font-semibold tracking-tight truncate">{title}</h3>
      {detail && <p className="text-[12px] md:text-[13px] text-muted-foreground mt-1 line-clamp-2">{detail}</p>}
    </div>
    {meta && (
      <div className="hidden md:block shrink-0 text-right pr-8">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{meta}</div>
      </div>
    )}
  </div>
);