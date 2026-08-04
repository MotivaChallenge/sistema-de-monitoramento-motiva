import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "warning" | "critical";

const toneText: Record<Tone, string> = {
  neutral: "text-foreground",
  positive: "text-turquoise",
  warning: "text-tertiary",
  critical: "text-destructive",
};

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  tone?: Tone;
  onClick?: () => void;
  /** Reanima o valor quando muda (usado na seleção do mapa). */
  animateKey?: string;
};

export const StatisticCard = ({
  icon: Icon, label, value, suffix, hint, tone = "neutral", onClick, animateKey,
}: Props) => {
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cn(
        "text-left w-full bg-surface-lowest rounded-xl p-5 border border-border/50 shadow-card transition-smooth",
        onClick && "hover:-translate-y-0.5 hover:shadow-elegant hover:border-primary/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 outline-none"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <Icon className={cn("h-4 w-4", toneText[tone])} />
      </div>
      <div key={animateKey ?? value} className="animate-fade-in flex items-baseline gap-1.5">
        <span className={cn("text-[30px] leading-none font-bold tabular-nums tracking-tight", toneText[tone])}>{value}</span>
        {suffix && <span className="text-[13px] text-muted-foreground font-medium">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-2">{hint}</p>}
    </Wrapper>
  );
};