import { useEffect, useState } from "react";
import { Bell, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlertsFeed, getLastSeen, markAllSeen, AlertFeedItem } from "@/hooks/useAlertsFeed";
import { useNavigate } from "react-router-dom";

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
};

const statusMeta: Record<AlertFeedItem["status"], { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  critico: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Crítico" },
  atencao: { icon: AlertCircle, color: "text-tertiary", bg: "bg-tertiary/15", label: "Atenção" },
  conforme: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", label: "Conforme" },
};

export const NotificationsPanel = () => {
  const { data: alerts = [], isLoading } = useAlertsFeed();
  const navigate = useNavigate();
  const [lastSeen, setLastSeen] = useState<number>(() => getLastSeen());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setLastSeen(getLastSeen());
    window.addEventListener("vegia:alerts-seen", handler);
    return () => window.removeEventListener("vegia:alerts-seen", handler);
  }, []);

  const unread = alerts.filter(a => new Date(a.createdAt).getTime() > lastSeen).length;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && unread > 0) markAllSeen();
      }}
    >
      <PopoverTrigger asChild>
        <button
          title="Notificações"
          className="relative h-9 w-9 rounded-full hover:bg-surface-high flex items-center justify-center text-muted-foreground"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 bg-surface-lowest border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold">Notificações</div>
            <div className="text-[11px] text-muted-foreground">Últimas alterações de status</div>
          </div>
          <span className="text-[11px] px-2 py-1 rounded-full bg-surface-high font-mono">{alerts.length}</span>
        </div>
        <ScrollArea className="max-h-[380px]">
          {isLoading && (
            <div className="px-4 py-6 text-[12px] text-muted-foreground">Carregando…</div>
          )}
          {!isLoading && alerts.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              Nenhuma notificação registrada.
            </div>
          )}
          <ul className="divide-y divide-border/40">
            {alerts.map(a => {
              const meta = statusMeta[a.status];
              const Icon = meta.icon;
              const isUnread = new Date(a.createdAt).getTime() > lastSeen;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate(`/segmento/${a.segmentId}`);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-surface-low flex gap-3 transition-colors"
                  >
                    <div className={`h-8 w-8 rounded-full ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold truncate">{a.km}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold ${meta.color}`}>{meta.label}</span>
                        {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary ml-auto" />}
                      </div>
                      <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{a.message}</p>
                      <span className="text-[11px] text-muted-foreground/70 mt-1 block">{fmtRelative(a.createdAt)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};