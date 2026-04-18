import { useMemo, useState } from "react";
import { Segment } from "@/data/mock";
import { StatusDot } from "./ComplianceBadge";
import { ClausePill } from "./MonoClause";
import { Filter, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NDVIBar = ({ value }: { value: number }) => {
  const color = value >= 0.6 ? "bg-primary" : value >= 0.4 ? "bg-tertiary" : "bg-destructive";
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-16 rounded-full bg-surface-high overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
      <span className="text-[13px] font-medium tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
};

export const SegmentTable = ({ rows }: { rows: Segment[] }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const data = useMemo(() => {
    const filtered = rows.filter(r => `${r.km} ${r.tipo}`.toLowerCase().includes(q.toLowerCase()));
    return [...filtered].sort((a, b) => sortDesc ? b.altura - a.altura : a.altura - b.altura);
  }, [rows, q, sortDesc]);

  return (
    <div className="bg-surface-lowest rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-semibold">Detalhamento por Segmento</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-low rounded-md px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar"
              className="bg-transparent outline-none text-[13px] w-32"
            />
          </div>
          <button onClick={() => setSortDesc(s => !s)} className="text-muted-foreground hover:text-foreground">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[1.4fr_1.2fr_1.1fr_0.8fr_1.1fr_0.9fr_0.9fr] label-md pb-3">
        <span>Segmento (KM)</span><span>Tipo</span><span>NDVI</span><span>Altura</span><span>Status</span><span>Cláusula</span><span>Deadline</span>
      </div>
      <div className="space-y-1">
        {data.map((r, i) => (
          <button
            key={r.id}
            onClick={() => navigate(`/segmento/${r.id}`)}
            className={`w-full text-left grid grid-cols-[1.4fr_1.2fr_1.1fr_0.8fr_1.1fr_0.9fr_0.9fr] items-center px-3 py-3.5 rounded-md hover:bg-surface-low transition ${i % 2 === 1 ? "bg-surface-low/60" : ""}`}
          >
            <span className="text-[14px] font-medium">{r.km}</span>
            <span className="text-[13px] text-muted-foreground">{r.tipo}</span>
            <NDVIBar value={r.ndvi} />
            <span className="text-[13px] tabular-nums">{r.altura}cm</span>
            <StatusDot status={r.status} label={r.status === "critico" ? "Inconformidade" : r.status === "atencao" ? "Atenção" : "Conforme"} />
            <ClausePill>{r.clausula}</ClausePill>
            <span className={`text-[13px] tabular-nums ${r.deadlineUrgent ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
              {r.deadline ? r.deadline.split(" ")[0] : "—"}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mt-5 pt-4">
        <span className="label-md">Documento gerado via satélite — 24/04/2026 14:32</span>
        <button className="text-primary text-[13px] font-semibold">Ver todos os segmentos ›</button>
      </div>
    </div>
  );
};
