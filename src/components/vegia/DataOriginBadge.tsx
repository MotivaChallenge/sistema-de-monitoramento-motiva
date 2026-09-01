import { Satellite, Ruler, Eye, BadgeCheck, FlaskConical } from "lucide-react";
import { DataOrigin, ORIGIN_META } from "@/lib/data-provenance";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ICON: Record<DataOrigin, typeof Satellite> = {
  campo: Ruler,
  satelite: Satellite,
  cv: Eye,
  validado: BadgeCheck,
  demo: FlaskConical,
};

interface Props {
  origin: DataOrigin;
  /** `short` mostra apenas a palavra-chave (tabelas/cards compactos). */
  variant?: "full" | "short";
  className?: string;
}

/** Selo obrigatório de origem do dado (campo × estimativa × visão computacional). */
export const DataOriginBadge = ({ origin, variant = "short", className = "" }: Props) => {
  const meta = ORIGIN_META[origin];
  const Icon = ICON[origin];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.className} ${className}`}
          >
            <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{variant === "full" ? meta.label : meta.short}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-[12px] leading-snug">
          <span className="block font-semibold mb-1">{meta.label}</span>
          {meta.description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
