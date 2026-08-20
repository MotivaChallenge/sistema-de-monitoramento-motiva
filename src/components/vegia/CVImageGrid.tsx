import { useMemo } from "react";
import { useCvResults } from "@/hooks/useVegiaData";
import { formatKmQuery } from "@/lib/km-search";
import { Info } from "lucide-react";

const colorOf = (s: string) =>
  s === "critico" ? "border-destructive bg-destructive text-destructive-foreground"
  : s === "atencao" ? "border-tertiary bg-tertiary text-white"
  : "border-[hsl(var(--on-secondary-container))] bg-secondary-container text-secondary-on-container";

const boxBorder = (s: string) =>
  s === "critico" ? "border-destructive" : s === "atencao" ? "border-tertiary" : "border-[hsl(var(--on-secondary-container))]";

const gradients = [
  "linear-gradient(135deg, #6FB585 0%, #2C5F3F 100%)",
  "linear-gradient(135deg, #4F7942 0%, #1A3A1F 100%)",
  "linear-gradient(135deg, #C9A66B 0%, #6E5028 100%)",
  "linear-gradient(135deg, #E8B57A 0%, #8B5A3C 100%)",
  "linear-gradient(135deg, #4A6B5C 0%, #1F3A2C 100%)",
  "linear-gradient(135deg, #5C8C6F 0%, #2D5A45 100%)",
];

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export type CvScope = "segmento" | "rodovia" | "malha";

interface Props {
  /** Trecho de referência — usado no escopo "segmento". */
  segmentId?: string;
  /** Rodovia de referência — usada no escopo "rodovia". */
  rodovia?: string | null;
  /** Faixa de KM do trecho, para vincular detecções ainda sem `segment_id`. */
  kmStart?: number;
  kmEnd?: number;
  scope?: CvScope;
}

export const CVImageGrid = ({ segmentId, rodovia, kmStart, kmEnd, scope = "malha" }: Props) => {
  const { data: all = [], isLoading } = useCvResults();

  const cvImages = useMemo(() => {
    if (scope === "malha") return all;
    if (scope === "rodovia") {
      if (!rodovia) return all;
      return all.filter(d => (d.rodovia ?? null) === rodovia);
    }
    // escopo do trecho: vínculo explícito ou ponto quilométrico dentro do intervalo
    return all.filter(d => {
      if (segmentId && d.segmentId === segmentId) return true;
      if (d.segmentId) return false;
      if (kmStart == null || kmEnd == null || d.kmValue == null) return false;
      if (rodovia && d.rodovia && d.rodovia !== rodovia) return false;
      return d.kmValue >= kmStart && d.kmValue <= kmEnd;
    });
  }, [all, scope, segmentId, rodovia, kmStart, kmEnd]);

  if (isLoading) return <div className="text-[13px] text-muted-foreground">Carregando análises…</div>;

  if (!cvImages.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-lowest p-8 text-center">
        <Info className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
        <p className="text-[13.5px] font-medium">Nenhuma detecção vinculada a este escopo</p>
        <p className="text-[12.5px] text-muted-foreground mt-1">
          As detecções exibidas aqui vêm de capturas com quilômetro registrado. Alterne o escopo para
          ver detecções da rodovia ou de toda a malha.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {cvImages.map((img, i) => (
        <div key={img.id} className="bg-surface-lowest rounded-xl overflow-hidden border border-border/40">
          <div className="relative aspect-[4/3]" style={{ background: gradients[i % gradients.length] }}>
            <span className="absolute bottom-3 left-3 bg-black/55 text-white text-[11px] tracking-wider px-2 py-1 rounded font-mono">
              {img.kmValue != null ? formatKmQuery(img.kmValue) : img.km}
            </span>
            {img.rodovia && (
              <span className="absolute top-3 left-3 bg-black/55 text-white text-[10px] font-semibold tracking-wider px-2 py-1 rounded">
                {img.rodovia}
              </span>
            )}
            {img.box && (
              <div
                className={`absolute border-2 rounded-sm ${boxBorder(img.status)}`}
                style={{ left: `${img.box.x}%`, top: `${img.box.y}%`, width: `${img.box.w}%`, height: `${img.box.h}%` }}
              >
                <span className={`absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap ${colorOf(img.status)}`}>
                  {img.label}_{img.confidence.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="label-md">Detecção de ativos</span>
              <span className={`text-[13px] font-semibold ${img.status === "critico" ? "text-destructive" : img.status === "atencao" ? "text-tertiary" : "text-primary"}`}>
                {img.confidence.toFixed(1)}% Conf.
              </span>
            </div>
            <p className="text-[13px] text-foreground/80 leading-snug truncate">{img.caption}</p>
            <dl className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
              <div>
                <dt className="text-muted-foreground">Trecho</dt>
                <dd className="font-medium truncate">{img.segmentId ?? "Não vinculado"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Captura</dt>
                <dd className="font-medium">{fmtDate(img.capturedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Modelo</dt>
                <dd className="font-medium truncate">{img.model ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Revisão</dt>
                <dd className="font-medium capitalize">{img.reviewStatus ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      ))}
    </div>
  );
};
