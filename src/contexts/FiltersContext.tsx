import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";
import { Status } from "@/types/domain";

export type StatusFilter = Status; // "critico" | "atencao" | "conforme"

interface FiltersCtx {
  statuses: StatusFilter[];
  kmRange: [number, number];
  toggleStatus: (s: StatusFilter) => void;
  setStatuses: (s: StatusFilter[]) => void;
  setKmRange: (r: [number, number]) => void;
  reset: () => void;
  activeCount: number;
  matches: (s: { status: Status; kmStart: number }) => boolean;
}

const KM_MAX = 30;
const DEFAULT: Pick<FiltersCtx, "statuses" | "kmRange"> = { statuses: [], kmRange: [0, KM_MAX] };

const Ctx = createContext<FiltersCtx | null>(null);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const [statuses, setStatuses] = useState<StatusFilter[]>(DEFAULT.statuses);
  const [kmRange, setKmRange] = useState<[number, number]>(DEFAULT.kmRange);

  const toggleStatus = useCallback((s: StatusFilter) => {
    setStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);

  const reset = useCallback(() => {
    setStatuses(DEFAULT.statuses);
    setKmRange(DEFAULT.kmRange);
  }, []);

  const value = useMemo<FiltersCtx>(() => {
    const activeCount = (statuses.length > 0 ? 1 : 0) + (kmRange[0] > 0 || kmRange[1] < KM_MAX ? 1 : 0);
    return {
      statuses, kmRange, toggleStatus, setStatuses, setKmRange, reset, activeCount,
      matches: (s) =>
        (statuses.length === 0 || statuses.includes(s.status)) &&
        s.kmStart >= kmRange[0] && s.kmStart <= kmRange[1],
    };
  }, [statuses, kmRange, toggleStatus, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useFilters = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used inside FiltersProvider");
  return ctx;
};

export const KM_FILTER_MAX = KM_MAX;