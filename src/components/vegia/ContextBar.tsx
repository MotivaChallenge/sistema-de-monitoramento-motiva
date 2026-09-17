import { MapPin, CalendarRange, RefreshCw, Beaker } from "lucide-react";
import { DataOriginBadge } from "./DataOriginBadge";
import { MethodologyDialog } from "./MethodologyDialog";
import type { DataOrigin } from "@/lib/data-provenance";

interface Props {
  /** Recorte ativo: rodovia, extensão e nº de trechos. */
  recorte: string;
  periodo?: string;
  updatedAt?: Date | string | null;
  /** Origem predominante dos números exibidos na tela. */
  origin?: DataOrigin;
  /** Modo demonstrativo quando os dados do recorte não são leitura orbital real. */
  demo?: boolean;
  className?: string;
}

const fmt = (v?: Date | string | null) => {
  if (!v) return "não calculado nesta execução";
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("pt-BR");
};

/** Faixa de contexto exibida no topo das telas: recorte, período, origem e modo. */
export const ContextBar = ({
  recorte, periodo = "últimos 60 dias (composição mediana)", updatedAt, origin = "satelite", demo = false, className = "",
}: Props) => (
  <div
    className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-surface-lowest px-4 py-3 shadow-card ${className}`}
    aria-label="Contexto do recorte exibido"
  >
    <Item icon={MapPin} label="Recorte" value={recorte} />
    <Item icon={CalendarRange} label="Período" value={periodo} />
    <Item icon={RefreshCw} label="Atualizado" value={fmt(updatedAt)} />
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Origem</span>
      <DataOriginBadge origin={demo ? "demo" : origin} />
    </div>
    <div className="flex items-center gap-1.5">
      <Beaker className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="text-[11px] font-semibold uppercase tracking-wider">
        {demo ? "Modo demonstrativo" : "Modo operacional"}
      </span>
    </div>
    <MethodologyDialog />
  </div>
);

const Item = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-center gap-2 min-w-0">
    <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
    <span className="text-[12px] font-semibold truncate">{value}</span>
  </div>
);
