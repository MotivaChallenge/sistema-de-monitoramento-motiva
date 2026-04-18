import { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  footer?: ReactNode;
  variant?: "default" | "danger" | "primary";
}

export const MetricCard = ({ label, value, unit, footer, variant = "primary" }: Props) => {
  const valueColor = variant === "danger" ? "text-destructive" : "text-primary";
  return (
    <div className="bg-surface-lowest rounded-xl p-5">
      <div className="label-md">{label}</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`text-[36px] leading-none font-semibold tracking-tight ${valueColor}`}>{value}</span>
        {unit && <span className="text-[13px] text-muted-foreground">{unit}</span>}
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
};
