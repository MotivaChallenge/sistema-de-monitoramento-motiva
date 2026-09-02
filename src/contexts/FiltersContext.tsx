import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";
import { Status } from "@/types/domain";
import { useSegments } from "@/hooks/useVegiaData";
import { parseKmQuery, matchesKmQuery, type KmQuery } from "@/lib/km-search";
import { originMatchesFilter, type DataOrigin, type OriginFilter } from "@/lib/data-provenance";

export type StatusFilter = Status; // "critico" | "atencao" | "conforme"

export interface MatchTarget {
  status: Status;
  kmStart: number;
  /** Fim do intervalo — permite busca por ponto quilométrico contido no trecho. */
  kmEnd?: number;
  rodovia?: string | null;
  /** Texto livre pesquisável (km, tipo, id…). */
  text?: string;
  /** Origem do dado (campo, satélite, visão computacional…). */
  origin?: DataOrigin;
  /** Se o registro está pendente de validação em campo. */
  needsFieldValidation?: boolean;
}

interface FiltersCtx {
  statuses: StatusFilter[];
  /** `null` = sem restrição de KM (padrão). */
  kmRange: [number, number] | null;
  /** Maior KM presente na malha carregada. */
  kmMax: number;
  /** Código da rodovia selecionada (`null` = toda a malha). */
  rodovia: string | null;
  /** Busca textual global. */
  search: string;
  toggleStatus: (s: StatusFilter) => void;
  setStatuses: (s: StatusFilter[]) => void;
  setKmRange: (r: [number, number] | null) => void;
  setRodovia: (code: string | null) => void;
  setSearch: (q: string) => void;
  /** Filtro por origem do dado. */
  origin: OriginFilter;
  setOrigin: (o: OriginFilter) => void;
  reset: () => void;
  activeCount: number;
  matches: (s: MatchTarget) => boolean;
  /** Consulta textual interpretada (regra aplicada e explicação). */
  searchQuery: KmQuery;
}

const Ctx = createContext<FiltersCtx | null>(null);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const { data: segments } = useSegments();
  const [statuses, setStatuses] = useState<StatusFilter[]>([]);
  const [kmRange, setKmRange] = useState<[number, number] | null>(null);
  const [rodovia, setRodovia] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<OriginFilter>("todas");

  /** Limite superior do slider — derivado da malha real, nunca fixo. */
  const kmMax = useMemo(() => {
    const max = (segments ?? []).reduce((a, s) => Math.max(a, s.kmEnd), 0);
    return max > 0 ? Math.ceil(max) : 100;
  }, [segments]);

  const toggleStatus = useCallback((s: StatusFilter) => {
    setStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);

  const reset = useCallback(() => {
    setStatuses([]);
    setKmRange(null);
    setRodovia(null);
    setSearch("");
    setOrigin("todas");
  }, []);

  const value = useMemo<FiltersCtx>(() => {
    const kmActive = !!kmRange && (kmRange[0] > 0 || kmRange[1] < kmMax);
    const q = search.trim().toLowerCase();
    const parsed = parseKmQuery(search);
    const activeCount =
      (statuses.length > 0 ? 1 : 0) + (kmActive ? 1 : 0) + (rodovia ? 1 : 0) + (q ? 1 : 0) + (origin !== "todas" ? 1 : 0);
    return {
      statuses, kmRange, kmMax, rodovia, search, origin, setOrigin,
      toggleStatus, setStatuses, setKmRange, setRodovia, setSearch, reset, activeCount,
      searchQuery: parsed,
      matches: (s) =>
        (statuses.length === 0 || statuses.includes(s.status)) &&
        (!kmActive || (s.kmStart >= kmRange![0] && s.kmStart <= kmRange![1])) &&
        (!rodovia || s.rodovia === undefined || s.rodovia === rodovia) &&
        (origin === "todas" || s.origin === undefined ||
          originMatchesFilter(s.origin, origin, s.needsFieldValidation ?? false)) &&
        matchesKmQuery(parsed, {
          kmStart: s.kmStart,
          kmEnd: s.kmEnd,
          rodovia: s.rodovia,
          text: s.text,
        }),
    };
  }, [statuses, kmRange, kmMax, rodovia, search, origin, toggleStatus, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useFilters = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used inside FiltersProvider");
  return ctx;
};
