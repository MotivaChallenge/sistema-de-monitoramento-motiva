import { OSMMap } from "@/components/vegia/OSMMap";
import { Skeleton } from "@/components/ui/skeleton";
import type { SegmentPoint } from "@/hooks/useDashboardData";

type Props = {
  points: SegmentPoint[];
  polyline: [number, number][];
  selectedId?: string;
  loading?: boolean;
  onSelect: (p: SegmentPoint) => void;
};

export const DashboardMap = ({ points, polyline, selectedId, loading, onSelect }: Props) => {
  if (loading) return <Skeleton className="h-[420px] md:h-[520px] w-full rounded-xl" />;

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-card">
      <OSMMap
        className="h-[420px] md:h-[520px] w-full"
        baseLayer="street"
        fitBounds
        polyline={polyline}
        markers={points.map(p => ({
          lat: p.lat,
          lng: p.lng,
          status: p.segment.status,
          label: `${p.segment.km} · ${p.segment.tipo}${p.segment.id === selectedId ? " (selecionado)" : ""}`,
          onClick: () => onSelect(p),
        }))}
      />
      <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-3 rounded-lg bg-background/85 backdrop-blur px-3 py-2 border border-border/60 text-[11px]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />Crítico</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-tertiary" />Atenção</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-turquoise" />Normal</span>
      </div>
    </div>
  );
};