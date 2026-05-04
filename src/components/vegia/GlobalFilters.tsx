import { useFilters, KM_FILTER_MAX, StatusFilter } from "@/contexts/FiltersContext";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X } from "lucide-react";

const STATUS_CHIPS: { key: StatusFilter; label: string; cls: string }[] = [
  { key: "critico", label: "Crítico", cls: "bg-destructive/15 text-destructive border-destructive/40" },
  { key: "atencao", label: "Atenção", cls: "bg-tertiary/15 text-tertiary border-tertiary/50" },
  { key: "conforme", label: "Conforme", cls: "bg-primary/10 text-primary border-primary/40" },
];

export const GlobalFilters = () => {
  const { statuses, kmRange, toggleStatus, setKmRange, reset, activeCount } = useFilters();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Abrir filtros globais"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[12px] font-semibold uppercase tracking-wider text-foreground hover:bg-surface-low whitespace-nowrap"
        >
          <Filter className="h-3.5 w-3.5" /> Filtros
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] rounded-full bg-primary text-primary-foreground px-1">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-4 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Status</div>
          <div className="flex flex-wrap gap-2">
            {STATUS_CHIPS.map(c => {
              const active = statuses.includes(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggleStatus(c.key)}
                  className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border transition ${
                    active ? c.cls : "border-border text-muted-foreground hover:bg-surface-high"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Faixa de KM</div>
            <div className="text-[12px] font-mono">KM {kmRange[0]} – {kmRange[1]}</div>
          </div>
          <Slider
            min={0}
            max={KM_FILTER_MAX}
            step={1}
            value={kmRange}
            onValueChange={(v) => setKmRange([v[0], v[1]] as [number, number])}
          />
        </div>
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};