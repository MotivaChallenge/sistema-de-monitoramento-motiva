import { useMemo, useState } from "react";
import { Segment, Status } from "@/types/domain";
import { StatusDot } from "./ComplianceBadge";
import { ClausePill } from "./MonoClause";
import { Search, ArrowUpDown, Download, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatKmRange } from "@/lib/km";
import { DataOriginBadge } from "./DataOriginBadge";
import { ORIGIN_META, segmentOrigin } from "@/lib/data-provenance";
import { evaluateDecision, MODEL_UNCERTAINTY_CM, segmentUncertainty } from "@/lib/uncertainty";

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

type StatusFilter = "all" | Status;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "critico", label: "Crítico" },
  { value: "atencao", label: "Atenção" },
  { value: "conforme", label: "Conforme" },
];

const csvEscape = (v: string | number) => {
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const SegmentTable = ({ rows }: { rows: Segment[] }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [clausula, setClausula] = useState<string>("all");
  const [rodovia, setRodovia] = useState<string>("all");
  /** `null` = toda a malha; o limite vem dos próprios dados. */
  const [kmRange, setKmRange] = useState<[number, number] | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  const kmMax = useMemo(
    () => Math.max(1, Math.ceil(rows.reduce((a, r) => Math.max(a, r.kmEnd), 0))),
    [rows]
  );
  const range: [number, number] = kmRange ?? [0, kmMax];

  const clauseOptions = useMemo(
    () => Array.from(new Set(rows.map(r => r.clausula))).sort(),
    [rows]
  );

  const rodoviaOptions = useMemo(
    () => Array.from(new Set(rows.map(r => r.rodovia).filter(Boolean) as string[])).sort(),
    [rows]
  );

  const data = useMemo(() => {
    const filtered = rows.filter(r => {
      if (q && !`${r.km} ${r.tipo}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (clausula !== "all" && r.clausula !== clausula) return false;
      if (rodovia !== "all" && r.rodovia !== rodovia) return false;
      if (kmRange && (r.kmStart < kmRange[0] || r.kmStart > kmRange[1])) return false;
      return true;
    });
    return [...filtered].sort((a, b) => sortDesc ? b.altura - a.altura : a.altura - b.altura);
  }, [rows, q, statusFilter, clausula, rodovia, kmRange, sortDesc]);

  const kmActive = !!kmRange && (kmRange[0] > 0 || kmRange[1] < kmMax);
  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (clausula !== "all" ? 1 : 0) + (rodovia !== "all" ? 1 : 0) + (kmActive ? 1 : 0) + (q ? 1 : 0);

  const resetFilters = () => {
    setQ(""); setStatusFilter("all"); setClausula("all"); setRodovia("all"); setKmRange(null);
  };

  const generatedAt = useMemo(
    () => new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    [],
  );

  const exportCsv = () => {
    const headers = ["Segmento (KM)", "KM Inicial", "KM Final", "Tipo", "NDVI", "Altura estimada (cm)", "Incerteza (± cm)", "Limite (cm)", "Status", "Zona de decisão", "Origem do dado", "Cláusula", "Última Roçada", "Deadline"];
    const lines = [
      headers.join(";"),
      ...data.map(r => [
        r.km, r.kmStart, r.kmEnd, r.tipo, r.ndvi.toFixed(2), r.altura, segmentUncertainty(r), r.limite,
        r.status === "critico" ? "Inconformidade" : r.status === "atencao" ? "Atenção" : "Conforme",
        evaluateDecision({ altura: r.altura, limite: r.limite, uncertaintyCm: segmentUncertainty(r) }).title,
        ORIGIN_META[segmentOrigin(r)].label,
        r.clausula, r.ultimaRocada, r.deadline ?? "",
      ].map(csvEscape).join(";")),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vegiamap-relatorio-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado", { description: `${data.length} segmento(s) · separador ;` });
  };

  return (
    <div className="bg-surface-lowest rounded-xl p-4 md:p-6 min-w-0 max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-[16px] font-semibold">Detalhamento por Segmento</h3>
          <span className="label-md">{data.length} de {rows.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="flex items-center gap-2 bg-surface-low rounded-md px-3 py-1.5 min-w-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar KM ou tipo"
              aria-label="Buscar segmento por KM ou tipo"
              className="bg-transparent outline-none text-[13px] w-32 sm:w-40 min-w-0"
            />
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-surface-low hover:bg-surface-high text-[12px] font-semibold tracking-wider uppercase text-foreground"
            title="Exportar CSV"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-surface-low rounded-md p-4 mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Status segmented */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-md">Status</span>
          <div className="inline-flex flex-wrap bg-surface-high rounded-md p-0.5">
            {STATUS_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setStatusFilter(o.value)}
                className={`px-3 h-7 rounded text-[12px] font-medium transition ${
                  statusFilter === o.value ? "bg-surface-lowest text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {rodoviaOptions.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="label-md">Rodovia</span>
            <select
              value={rodovia}
              onChange={e => setRodovia(e.target.value)}
              aria-label="Filtrar por rodovia"
              className="bg-surface-high rounded-md h-7 px-2 text-[12px] font-mono outline-none"
            >
              <option value="all">Todas</option>
              {rodoviaOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Cláusula */}
        <div className="flex items-center gap-3">
          <span className="label-md">Cláusula</span>
          <select
            value={clausula}
            onChange={e => setClausula(e.target.value)}
            className="bg-surface-high rounded-md h-7 px-2 text-[12px] font-mono outline-none"
          >
            <option value="all">Todas</option>
            {clauseOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* KM range */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <span className="label-md whitespace-nowrap">KM</span>
          <span className="text-[12px] tabular-nums w-10 text-right">{range[0].toFixed(0)}</span>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <input
              type="range" min={0} max={kmMax} step={1}
              aria-label="KM inicial"
              value={range[0]}
              onChange={e => setKmRange([Math.min(Number(e.target.value), range[1]), range[1]])}
              className="flex-1 min-w-0 accent-primary"
            />
            <input
              type="range" min={0} max={kmMax} step={1}
              aria-label="KM final"
              value={range[1]}
              onChange={e => setKmRange([range[0], Math.max(Number(e.target.value), range[0])])}
              className="flex-1 min-w-0 accent-primary"
            />
          </div>
          <span className="text-[12px] tabular-nums w-10">{range[1].toFixed(0)}</span>
        </div>

        {activeFilters > 0 && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Limpar ({activeFilters})
          </button>
        )}
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="min-w-[860px]">
      <div className="grid grid-cols-[1.4fr_1.1fr_1fr_0.9fr_1.1fr_1fr_0.9fr_0.8fr] label-md pb-3">
        <span>Segmento (KM)</span><span>Tipo</span><span>NDVI</span>
        <button onClick={() => setSortDesc(s => !s)} className="flex items-center gap-1 hover:text-foreground text-left">
          Altura est. <ArrowUpDown className="h-3 w-3" />
        </button>
        <span>Status</span><span>Origem</span><span>Cláusula / limite</span><span>Deadline</span>
      </div>

      <div className="space-y-1">
        {data.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-[13px]">
            Nenhum segmento corresponde aos filtros.
          </div>
        )}
        {data.map((r, i) => (
          <button
            key={r.id}
            onClick={() => navigate(`/segmento/${r.id}`)}
            className={`w-full text-left grid grid-cols-[1.4fr_1.1fr_1fr_0.9fr_1.1fr_1fr_0.9fr_0.8fr] items-center px-3 py-3.5 rounded-md hover:bg-surface-low transition ${i % 2 === 1 ? "bg-surface-low/60" : ""}`}
          >
            <span className="text-[14px] font-medium leading-tight">
              {r.km}
              <span className="block text-[11px] text-muted-foreground font-normal tabular-nums">
                {formatKmRange(r.kmStart, r.kmEnd)}
              </span>
            </span>
            <span className="text-[13px] text-muted-foreground">{r.tipo}</span>
            <NDVIBar value={r.ndvi} />
            <span className="text-[13px] tabular-nums leading-tight">
              {r.altura}<span className="text-muted-foreground text-[11px]"> ±{segmentUncertainty(r)}</span>cm
              {evaluateDecision({ altura: r.altura, limite: r.limite, uncertaintyCm: segmentUncertainty(r) }).needsFieldValidation && (
                <span className="block text-[10px] text-tertiary font-semibold uppercase tracking-wider">validar em campo</span>
              )}
            </span>
            <StatusDot status={r.status} label={r.status === "critico" ? "Inconformidade" : r.status === "atencao" ? "Atenção" : "Conforme"} />
            <DataOriginBadge origin={segmentOrigin(r)} />
            <span className="leading-tight">
              <ClausePill>{r.clausula}</ClausePill>
              <span className="block text-[10px] text-muted-foreground mt-0.5">limite {r.limite} cm</span>
            </span>
            <span className={`text-[13px] tabular-nums ${r.deadlineUrgent ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
              {r.deadline ? r.deadline.split(" ")[0] : <span className="text-[11px]">Sem prazo definido</span>}
            </span>
          </button>
        ))}
      </div>
      </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-5 pt-4">
        <span className="label-md">Alturas estimadas por satélite + modelo (incerteza por trecho, mínimo ± {MODEL_UNCERTAINTY_CM} cm) — {generatedAt}</span>
        <button onClick={resetFilters} className="text-primary text-[13px] font-semibold hover:underline">
          Ver todos os segmentos ›
        </button>
      </div>
    </div>
  );
};
