import { useState } from "react";
import { Bell, AlertTriangle, AlertCircle, CheckCircle2, Info, ArrowRight, Wrench } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, Notification } from "@/hooks/useNotifications";
import { Link } from "react-router-dom";

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

const typeMeta: Record<string, { icon: typeof Info; color: string; bg: string; label: string }> = {
  alert: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Alerta" },
  work_order: { icon: Wrench, color: "text-primary", bg: "bg-primary/10", label: "Ordem" },
  system: { icon: Info, color: "text-muted-foreground", bg: "bg-surface-high", label: "Sistema" },
};

const getMeta = (n: Notification) => {
  if (n.type === "alert") {
    return typeMeta.alert;
  }
  if (n.type === "work_order") {
    return typeMeta.work_order;
  }
  return typeMeta.system;
};

export const NotificationsPanel = () => {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [open, setOpen] = useState(false);

  const unread = notifications.filter(n => !n.read).length;
  const latest = notifications.slice(0, 8);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        <button
          title="Notificações"
          aria-label="Notificações"
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
            <div className="text-[11px] text-muted-foreground">
              {unread === 0 ? "Você está em dia" : `${unread} não lida${unread > 1 ? "s" : ""}`}
            </div>
          </div>
          <span className="text-[11px] px-2 py-1 rounded-full bg-surface-high font-mono">{notifications.length}</span>
        </div>
        <ScrollArea className="max-h-[380px]">
          {isLoading && (
            <div className="px-4 py-6 text-[12px] text-muted-foreground">Carregando…</div>
          )}
          {!isLoading && latest.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              Nenhuma notificação registrada.
            </div>
          )}
          <ul className="divide-y divide-border/40">
            {latest.map(n => {
              const meta = getMeta(n);
              const Icon = meta.icon;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id);
                      setOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-surface-low flex gap-3 transition-colors"
                  >
                    <div className={`h-8 w-8 rounded-full ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold truncate">{n.title}</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{meta.label}</span>
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary ml-auto" />}
                      </div>
                      <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                      <span className="text-[11px] text-muted-foreground/70 mt-1 block">{fmtRelative(n.created_at)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
        <div className="border-t border-border p-2 flex items-center justify-between gap-2">
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex-1 rounded-lg py-2 text-[12px] font-medium text-muted-foreground hover:bg-surface-high transition-colors"
            >
              Marcar todas como lidas
            </button>
          )}
          <Link
            to="/notificacoes"
            onClick={() => setOpen(false)}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-medium text-primary hover:bg-primary/5 transition-colors ${unread > 0 ? "flex-1" : "w-full"}`}
          >
            Ver central
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
