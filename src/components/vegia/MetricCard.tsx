import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  footer?: ReactNode;
  variant?: "default" | "danger" | "primary";
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
}

export const MetricCard = ({ label, value, unit, footer, variant = "primary", icon: Icon, trend }: Props) => {
  const valueColor = variant === "danger" ? "text-destructive" : "text-primary";
  const iconBg = variant === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary";
  return (
    <div className="group relative bg-surface-lowest rounded-xl p-5 border border-border/40 shadow-card hover:shadow-elegant hover:border-border transition-smooth">
      <div className="flex items-start justify-between gap-3">
        <div className="label-md">{label}</div>
        {Icon && (
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${iconBg} opacity-80 group-hover:opacity-100 transition-smooth`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-[34px] md:text-[36px] leading-none font-semibold tracking-tight tabular-nums ${valueColor}`}>{value}</span>
        {unit && <span className="text-[12px] text-muted-foreground">{unit}</span>}
        {trend && (
          <span className={`ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded ${trend.positive ? "bg-turquoise/15 text-turquoise" : "bg-destructive/10 text-destructive"}`}>
            {trend.value}
          </span>
        )}
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
};
