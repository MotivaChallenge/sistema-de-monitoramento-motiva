import { useMemo } from "react";
import { useSegments, useKmMarkers, useFieldTeams, useHighways } from "@/hooks/useVegiaData";
import { useWeather } from "@/hooks/useWeather";
import { ircForSegment } from "@/lib/irc";
import type { Segment, Status } from "@/types/domain";

export interface SegmentPoint {
  segment: Segment;
  lat: number;
  lng: number;
}

/** Nível de criticidade 1–5 derivado do IRC do trecho. */
export const criticalityLevel = (segment: Segment, rain5d = 0) => {
  const { score } = ircForSegment(segment, rain5d);
  return Math.min(5, Math.max(1, Math.round(score / 20) || 1));
};

export const useDashboardData = (rodovia?: string) => {
  const highwaysQ = useHighways();
  const segmentsQ = useSegments();
  const markersQ = useKmMarkers(rodovia);
  const teamsQ = useFieldTeams();
  const { data: weather } = useWeather();

  const rain5d = weather?.summary.totalRainMm ?? 0;

  const segments = useMemo(
    () => (segmentsQ.data ?? []).filter(s => (rodovia ? s.rodovia === rodovia : true)),
    [segmentsQ.data, rodovia]
  );

  /** Interpola lat/lng de um km a partir dos marcos da rodovia. */
  const points = useMemo<SegmentPoint[]>(() => {
    const marks = [...(markersQ.data ?? [])].sort((a, b) => a.km - b.km);
    if (!marks.length) return [];
    const locate = (km: number) => {
      if (km <= marks[0].km) return marks[0];
      const last = marks[marks.length - 1];
      if (km >= last.km) return last;
      for (let i = 0; i < marks.length - 1; i++) {
        const a = marks[i];
        const b = marks[i + 1];
        if (km >= a.km && km <= b.km) {
          const t = b.km === a.km ? 0 : (km - a.km) / (b.km - a.km);
          return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
        }
      }
      return null;
    };
    return segments
      .map(segment => {
        const p = locate(segment.kmStart);
        return p ? { segment, lat: p.lat, lng: p.lng } : null;
      })
      .filter(Boolean) as SegmentPoint[];
  }, [segments, markersQ.data]);

  const teams = teamsQ.data ?? [];
  const teamsAvailable = teams.filter(t => t.status === "disponivel").length;
  /** Capacidade diária somada de todas as equipes cadastradas. */
  const dailyCapacity = teams.reduce((a, t) => a + (t.capacidade_dia ?? 0), 0);

  const counts = useMemo(() => {
    const by = (s: Status) => segments.filter(x => x.status === s).length;
    return { critico: by("critico"), atencao: by("atencao"), conforme: by("conforme"), total: segments.length };
  }, [segments]);

  const kmCoverage = useMemo(() => {
    if (!segments.length) return 0;
    const min = Math.min(...segments.map(s => s.kmStart));
    const max = Math.max(...segments.map(s => s.kmEnd));
    return Number((max - min).toFixed(1));
  }, [segments]);

  const avgCriticality = segments.length
    ? Math.round(segments.reduce((a, s) => a + criticalityLevel(s, rain5d), 0) / segments.length)
    : 0;

  /** Trechos destacados no carousel superior — críticos e em atenção primeiro. */
  const highlights = useMemo(() => {
    const rank: Record<Status, number> = { critico: 0, atencao: 1, conforme: 2 };
    return [...segments].sort((a, b) => rank[a.status] - rank[b.status]).slice(0, 6);
  }, [segments]);

  return {
    highways: highwaysQ.data ?? [],
    segments,
    points,
    highlights,
    counts,
    kmCoverage,
    avgCriticality,
    rain5d,
    teams,
    teamsAvailable,
    teamsTotal: teams.length,
    dailyCapacity,
    isLoading: segmentsQ.isLoading || markersQ.isLoading,
    isError: segmentsQ.isError,
  };
};