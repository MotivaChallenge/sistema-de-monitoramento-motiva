import { useMemo } from "react";
import { useFilters, StatusFilter } from "@/contexts/FiltersContext";
import { useHighways } from "@/hooks/useVegiaData";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X, Search } from "lucide-react";

const STATUS_CHIPS: { key: StatusFilter; label: string; cls: string }[] = [
  { key: "critico", label: "Crítico", cls: "bg-destructive/15 text-destructive border-destructive/40" },
  { key: "atencao", label: "Atenção", cls: "bg-tertiary/15 text-tertiary border-tertiary/50" },
  { key: "conforme", label: "Conforme", cls: "bg-primary/10 text-primary border-primary/40" },
];

/** Filtros compartilhados: rodovia, status, faixa de KM e busca textual. */
export const GlobalFilters = ({ showSearch = true }: { showSearch?: boolean }) => {
  const {
    statuses, kmRange, kmMax, rodovia, search,
    toggleStatus, setKmRange, setRodovia, setSearch, reset, activeCount,
  } = useFilters();
  const { data: highways = [] } = useHighways();
  const range: [number, number] = kmRange ?? [0, kmMax];

  const grouped = useMemo(() => {
    const map = new Map<string, { code: string; nome: string }[]>();
    highways.forEach(h => {
      const arr = map.get(h.concessao) ?? [];
      arr.push({ code: h.code, nome: h.nome });
      map.set(h.concessao, arr);
    });
    return [...map.entries()];
  }, [highways]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Abrir filtros"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[12px] font-semibold uppercase tracking-wider text-foreground hover:bg-surface-low whitespace-nowrap transition-smooth"
        >
          <Filter className="h-3.5 w-3.5" /> Filtros
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] rounded-full bg-primary text-primary-foreground px-1">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[22rem] p-4 space-y-4">
        {showSearch && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Busca</div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="KM, tipo de trecho ou ID…"
                className="pl-8 h-9 text-[13px]"
                aria-label="Buscar trechos"
              />
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Rodovia</div>
          <select
            value={rodovia ?? ""}
            onChange={e => setRodovia(e.target.value || null)}
            aria-label="Selecionar rodovia"
            className="w-full h-9 rounded-md border border-border bg-background px-2 text-[13px]"
          >
            <option value="">Toda a malha</option>
            {grouped.map(([concessao, items]) => (
              <optgroup key={concessao} label={concessao}>
                {items.map(h => (
                  <option key={h.code} value={h.code}>{h.code} — {h.nome}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Status</div>
          <div className="flex flex-wrap gap-2">
            {STATUS_CHIPS.map(c => {
              const active = statuses.includes(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggleStatus(c.key)}
                  aria-pressed={active}
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
            <div className="text-[12px] font-mono">
              {kmRange ? `KM ${kmRange[0]} – ${kmRange[1]}` : "Toda a malha"}
            </div>
          </div>
          <Slider
            min={0}
            max={kmMax}
            step={1}
            value={range}
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
