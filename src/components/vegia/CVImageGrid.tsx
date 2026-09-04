import { useMemo, useState } from "react";
import { useCvResults } from "@/hooks/useVegiaData";
import { formatKmQuery } from "@/lib/km-search";
import { Info, GitCompareArrows, ClipboardCheck, Link2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/hooks/useAuth";
import { DataOriginBadge } from "./DataOriginBadge";
import { ConfirmationDialog } from "./ConfirmationDialog";

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

const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** Classifica a fonte da imagem a partir do texto livre gravado em `source`. */
const captureKind = (source?: string | null): { fonte: string; tipo: string } => {
  const s = (source ?? "").toLowerCase();
  if (s.includes("drone") || s.includes("vant")) return { fonte: "Drone", tipo: "aérea" };
  if (s.includes("satél") || s.includes("satel") || s.includes("orbital") || s.includes("sentinel")) return { fonte: "Orbital", tipo: "satélite" };
  if (s.includes("veicular") || s.includes("campo") || s.includes("celular")) return { fonte: "Terrestre", tipo: s.includes("veicular") ? "câmera veicular" : "captura de campo" };
  return { fonte: source ? source : "Não informada", tipo: "—" };
};

const REVIEW_LABEL: Record<string, string> = {
  pendente: "Pendente de revisão",
  validacao_campo: "Enviado p/ validação de campo",
  validado: "Validado em campo",
  descartado: "Descartado",
};

export type CvScope = "segmento" | "rodovia" | "malha";

interface Props {
  segmentId?: string;
  rodovia?: string | null;
  kmStart?: number;
  kmEnd?: number;
  scope?: CvScope;
}

export const CVImageGrid = ({ segmentId, rodovia, kmStart, kmEnd, scope = "malha" }: Props) => {
  const { data: all = [], isLoading } = useCvResults();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canEdit } = useAuth();
  const [sending, setSending] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const cvImages = useMemo(() => {
    if (scope === "malha") return all;
    if (scope === "rodovia") {
      if (!rodovia) return all;
      return all.filter(d => (d.rodovia ?? null) === rodovia);
    }
    return all.filter(d => {
      if (segmentId && d.segmentId === segmentId) return true;
      if (d.segmentId) return false;
      if (kmStart == null || kmEnd == null || d.kmValue == null) return false;
      if (rodovia && d.rodovia && d.rodovia !== rodovia) return false;
      return d.kmValue >= kmStart && d.kmValue <= kmEnd;
    });
  }, [all, scope, segmentId, rodovia, kmStart, kmEnd]);

  /** Pares antes/depois: mesma detecção (trecho + km) em datas distintas. */
  const comparableIds = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const d of all) {
      const key = `${d.segmentId ?? "x"}|${d.kmValue ?? d.km}`;
      groups.set(key, [...(groups.get(key) ?? []), d.id]);
    }
    const set = new Set<number>();
    for (const ids of groups.values()) if (ids.length > 1) ids.forEach(i => set.add(i));
    return set;
  }, [all]);

  const sendToField = async (id: number) => {
    const img = all.find(d => d.id === id);
    if (!img) return;
    setSending(id);
    const { error } = await supabase.from("cv_results").update({ review_status: "validacao_campo" }).eq("id", id);
    setSending(null);
    setConfirmId(null);
    if (error) { toast.error("Falha ao encaminhar", { description: error.message }); return; }
    await logAudit({
      action: "cv_send_to_field_validation", entity: "cv_results", entityId: String(id),
      before: { review_status: img.reviewStatus }, after: { review_status: "validacao_campo" },
    });
    qc.invalidateQueries({ queryKey: ["cv_results"] });
    toast.success("Enviado para validação de campo", { description: `Detecção #${id} · ${img.km}` });
  };

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
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {cvImages.map((img, i) => {
          const kind = captureKind(img.source);
          const illustrative = !img.imageRef;
          const comparable = comparableIds.has(img.id);
          return (
            <article key={img.id} className="bg-surface-lowest rounded-xl overflow-hidden border border-border/40 flex flex-col">
              <div className="relative aspect-[4/3]" style={{ background: gradients[i % gradients.length] }}>
                <span className="absolute bottom-3 left-3 bg-black/55 text-white text-[11px] tracking-wider px-2 py-1 rounded font-mono">
                  {img.kmValue != null ? formatKmQuery(img.kmValue) : img.km}
                </span>
                {img.rodovia && (
                  <span className="absolute top-3 left-3 bg-black/55 text-white text-[10px] font-semibold tracking-wider px-2 py-1 rounded">
                    {img.rodovia}
                  </span>
                )}
                <span className="absolute top-3 right-3">
                  <DataOriginBadge origin={illustrative ? "demo" : "cv"} />
                </span>
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
                {illustrative && (
                  <span className="absolute bottom-3 right-3 bg-black/55 text-white text-[9px] uppercase tracking-wider px-2 py-1 rounded">
                    renderização ilustrativa — sem imagem original
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="label-md flex items-center gap-2">Detecção <DataOriginBadge origin="cv" /></span>
                  <span className={`text-[13px] font-semibold ${img.status === "critico" ? "text-destructive" : img.status === "atencao" ? "text-tertiary" : "text-primary"}`}>
                    {img.confidence.toFixed(1)}% conf.
                  </span>
                </div>
                <p className="text-[13px] text-foreground/80 leading-snug truncate">{img.caption}</p>

                <dl className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
                  <Item label="Fonte da imagem" value={kind.fonte} />
                  <Item label="Tipo de captura" value={kind.tipo} />
                  <Item label="Data/hora" value={fmtDateTime(img.capturedAt)} />
                  <Item label="Coordenada / trecho" value={
                    img.lat != null && img.lng != null
                      ? `${img.lat.toFixed(5)}, ${img.lng.toFixed(5)}`
                      : img.segmentId ?? (img.kmValue != null ? formatKmQuery(img.kmValue) : "não vinculado")
                  } />
                  <Item label="Modelo / versão" value={`${img.model ?? "—"}${img.modelVersion ? ` ${img.modelVersion}` : ""}`} />
                  <Item label="Revisão" value={REVIEW_LABEL[img.reviewStatus ?? ""] ?? img.reviewStatus ?? "—"} />
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  {img.alertId ? (
                    <button onClick={() => navigate("/alertas")} className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
                      <Link2 className="h-3 w-3" /> Alerta vinculado
                    </button>
                  ) : img.workOrderId ? (
                    <button onClick={() => navigate("/ordens")} className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
                      <Link2 className="h-3 w-3" /> OS vinculada
                    </button>
                  ) : img.segmentId ? (
                    <button onClick={() => navigate(`/segmento/${img.segmentId}`)} className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
                      <Link2 className="h-3 w-3" /> Ver trecho
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Sem alerta/OS vinculada</span>
                  )}
                </div>

                <div className="mt-auto pt-3 grid grid-cols-2 gap-2">
                  <button
                    disabled={!comparable}
                    title={comparable ? "Comparar capturas do mesmo ponto" : "Sem imagem comparável para este ponto"}
                    className="h-8 rounded-md border border-border text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-45 hover:bg-surface-low"
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" /> Antes/depois
                  </button>
                  <button
                    disabled={!canEdit || sending === img.id || img.reviewStatus === "validacao_campo" || img.reviewStatus === "validado"}
                    onClick={() => setConfirmId(img.id)}
                    className="h-8 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-45"
                  >
                    {sending === img.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
                    Validação de campo
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmationDialog
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Enviar para validação de campo?"
        description="A detecção será marcada como pendente de validação presencial. Nenhuma ordem de serviço é criada automaticamente."
        confirmLabel="Enviar"
        variant="primary"
        onConfirm={() => confirmId !== null && sendToField(confirmId)}
      />
    </>
  );
};

const Item = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-medium truncate" title={value}>{value}</dd>
  </div>
);
