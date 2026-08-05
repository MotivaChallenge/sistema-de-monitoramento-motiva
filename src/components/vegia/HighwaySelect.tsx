import { useMemo } from "react";
import { toast } from "sonner";
import { Route } from "lucide-react";
import { useFilters } from "@/contexts/FiltersContext";
import { useHighways } from "@/hooks/useVegiaData";

/**
 * Seletor de rodovia sempre visível. Ao trocar, todo o painel passa a
 * exibir apenas os dados da rodovia escolhida.
 */
export const HighwaySelect = ({ className = "" }: { className?: string }) => {
  const { rodovia, setRodovia } = useFilters();
  const { data: highways = [] } = useHighways();

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
    <label className={`relative inline-flex items-center ${className}`}>
      <Route className="absolute left-2.5 h-3.5 w-3.5 text-primary pointer-events-none" aria-hidden />
      <span className="sr-only">Rodovia exibida</span>
      <select
        value={rodovia ?? ""}
        onChange={e => {
          const v = e.target.value || null;
          setRodovia(v);
          const nome = highways.find(h => h.code === v)?.nome;
          toast.success(
            v ? `Exibindo ${v}` : "Exibindo toda a malha",
            { description: v ? nome : "Filtro de rodovia removido." }
          );
        }}
        className="h-9 pl-8 pr-3 rounded-lg border border-border bg-surface-lowest text-[12px] font-semibold text-foreground max-w-[190px] truncate hover:bg-surface-low transition-smooth focus-visible:ring-2 focus-visible:ring-primary/50 outline-none"
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
    </label>
  );
};
