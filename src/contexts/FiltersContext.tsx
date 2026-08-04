import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";
import { Status } from "@/types/domain";
import { useSegments } from "@/hooks/useVegiaData";

export type StatusFilter = Status; // "critico" | "atencao" | "conforme"

interface FiltersCtx {
  statuses: StatusFilter[];
  /** `null` = sem restrição de KM (padrão). */
  kmRange: [number, number] | null;
  /** Maior KM presente na malha carregada. */
  kmMax: number;
  toggleStatus: (s: StatusFilter) => void;
  setStatuses: (s: StatusFilter[]) => void;
  setKmRange: (r: [number, number] | null) => void;
  reset: () => void;
  activeCount: number;
  matches: (s: { status: Status; kmStart: number }) => boolean;
}

const Ctx = createContext<FiltersCtx | null>(null);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const { data: segments } = useSegments();
  const [statuses, setStatuses] = useState<StatusFilter[]>([]);
  const [kmRange, setKmRange] = useState<[number, number] | null>(null);

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
  }, []);

  const value = useMemo<FiltersCtx>(() => {
    const kmActive = !!kmRange && (kmRange[0] > 0 || kmRange[1] < kmMax);
    const activeCount = (statuses.length > 0 ? 1 : 0) + (kmActive ? 1 : 0);
    return {
      statuses, kmRange, kmMax, toggleStatus, setStatuses, setKmRange, reset, activeCount,
      matches: (s) =>
        (statuses.length === 0 || statuses.includes(s.status)) &&
        (!kmActive || (s.kmStart >= kmRange![0] && s.kmStart <= kmRange![1])),
    };
  }, [statuses, kmRange, kmMax, toggleStatus, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useFilters = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used inside FiltersProvider");
  return ctx;
};