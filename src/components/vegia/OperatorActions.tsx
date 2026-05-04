import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useRegisterRocada,
  useResolveAlertsForSegment,
  useAddObservation,
  useRocadaEvents,
  useSegmentObservations,
} from "@/hooks/useOperator";
import { CheckCircle2, ClipboardPlus, MessageSquarePlus, History, Loader2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const OperatorActions = ({ segmentId }: { segmentId: string }) => {
  const { canEdit } = useAuth();
  const resolve = useResolveAlertsForSegment();
  const register = useRegisterRocada();
  const addObs = useAddObservation();
  const { data: events = [], isLoading: loadingEvents } = useRocadaEvents(segmentId);
  const { data: obs = [], isLoading: loadingObs } = useSegmentObservations(segmentId);

  const [rocadaOpen, setRocadaOpen] = useState(false);
  const [resp, setResp] = useState("");
  const [rocadaObs, setRocadaObs] = useState("");
  const [obsOpen, setObsOpen] = useState(false);
  const [obsTexto, setObsTexto] = useState("");
  const [obsAutor, setObsAutor] = useState("");

  if (!canEdit) {
    return (
      <div className="bg-surface-low rounded-xl p-4 text-[12px] text-muted-foreground flex items-center gap-2">
        <Lock className="h-3.5 w-3.5" /> Apenas operadores e administradores podem registrar ações.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Dialog open={rocadaOpen} onOpenChange={setRocadaOpen}>
          <DialogTrigger asChild>
            <button className="h-11 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[12px] font-semibold inline-flex items-center justify-center gap-1.5">
              <ClipboardPlus className="h-4 w-4" /> Roçada
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar nova roçada</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="resp">Responsável / equipe</Label>
                <Input id="resp" value={resp} onChange={e => setResp(e.target.value)} placeholder="Ex.: Consórcio SP-Verde" />
              </div>
              <div>
                <Label htmlFor="obs">Observação (opcional)</Label>
                <Textarea id="obs" value={rocadaObs} onChange={e => setRocadaObs(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={register.isPending}
                onClick={async () => {
                  await register.mutateAsync({ segmentId, responsavel: resp.trim() || undefined, observacao: rocadaObs.trim() || undefined });
                  setResp(""); setRocadaObs(""); setRocadaOpen(false);
                }}
              >
                {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <button
          disabled={resolve.isPending}
          onClick={() => resolve.mutate(segmentId)}
          className="h-11 rounded-lg bg-surface-high hover:bg-surface-high/80 text-[12px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Resolver
        </button>

        <Dialog open={obsOpen} onOpenChange={setObsOpen}>
          <DialogTrigger asChild>
            <button className="h-11 rounded-lg bg-surface-high hover:bg-surface-high/80 text-[12px] font-medium inline-flex items-center justify-center gap-1.5">
              <MessageSquarePlus className="h-4 w-4" /> Anotar
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova observação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="autor">Autor (opcional)</Label>
                <Input id="autor" value={obsAutor} onChange={e => setObsAutor(e.target.value)} placeholder="Seu nome" />
              </div>
              <div>
                <Label htmlFor="texto">Observação</Label>
                <Textarea id="texto" value={obsTexto} onChange={e => setObsTexto(e.target.value)} rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={addObs.isPending || !obsTexto.trim()}
                onClick={async () => {
                  await addObs.mutateAsync({ segmentId, texto: obsTexto.trim(), autor: obsAutor.trim() || undefined });
                  setObsTexto(""); setObsAutor(""); setObsOpen(false);
                }}
              >
                {addObs.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Histórico de roçadas */}
      <div className="bg-surface-lowest rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-[12px] font-semibold tracking-wider uppercase">Histórico de roçadas</h4>
        </div>
        {loadingEvents ? (
          <div className="text-[12px] text-muted-foreground">Carregando…</div>
        ) : events.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">Nenhuma roçada registrada.</div>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-auto">
            {events.map(e => (
              <li key={e.id} className="text-[12px] border-l-2 border-primary/40 pl-3 py-1">
                <div className="font-semibold">
                  {new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR")} · {e.responsavel ?? "—"}
                </div>
                {e.observacao && <p className="text-muted-foreground leading-relaxed">{e.observacao}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Observações */}
      <div className="bg-surface-lowest rounded-xl p-4">
        <h4 className="text-[12px] font-semibold tracking-wider uppercase mb-3">Observações de campo</h4>
        {loadingObs ? (
          <div className="text-[12px] text-muted-foreground">Carregando…</div>
        ) : obs.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">Nenhuma observação registrada.</div>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-auto">
            {obs.map(o => (
              <li key={o.id} className="text-[12px] border-l-2 border-tertiary/40 pl-3 py-1">
                <div className="text-muted-foreground text-[11px]">
                  {new Date(o.created_at).toLocaleString("pt-BR")} {o.autor && `· ${o.autor}`}
                </div>
                <p className="leading-relaxed">{o.texto}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};