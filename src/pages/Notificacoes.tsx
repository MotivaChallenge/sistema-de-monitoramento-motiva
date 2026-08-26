import { useEffect, useMemo, useState } from "react";
import { TopHeader } from "@/components/vegia/TopHeader";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QueryErrorState } from "@/components/vegia/QueryErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Check,
  Trash2,
  AlertTriangle,
  Wrench,
  Info,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const iconByType: Record<string, React.ReactNode> = {
  alert: <AlertTriangle className="h-4 w-4" />,
  work_order: <Wrench className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
  broadcast: <Megaphone className="h-4 w-4" />,
};

const labelByType: Record<string, string> = {
  alert: "Alerta",
  work_order: "Ordem de serviço",
  system: "Sistema",
  broadcast: "Comunicado",
};

const Notificacoes = () => {
  const { data: notifications, isLoading, error, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [periodFilter, setPeriodFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const periodDays = periodFilter === "todos" ? null : Number(periodFilter);
    const cutoff = periodDays ? Date.now() - periodDays * 86400000 : null;

    return (notifications ?? []).filter((n) => {
      if (activeTab === "unread" && n.read) return false;
      if (activeTab === "alerts" && n.type !== "alert") return false;
      if (typeFilter !== "todos" && n.type !== typeFilter) return false;
      if (cutoff && new Date(n.created_at).getTime() < cutoff) return false;
      if (term) {
        const haystack = `${n.title} ${n.body ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [notifications, activeTab, typeFilter, periodFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [activeTab, typeFilter, periodFilter, search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  const handleMarkAll = async () => {
    try {
      await markAll.mutateAsync();
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch (e) {
      toast.error("Erro ao marcar notificações", {
        description: (e as Error).message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success("Notificação removida");
    } catch (e) {
      toast.error("Erro ao remover notificação", {
        description: (e as Error).message,
      });
    }
  };

  return (
    <>
      <TopHeader breadcrumb={[{ label: "Início", to: "/dashboard" }]} current="Central de Notificações" />
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Notificações</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {unreadCount === 0
                    ? "Você está em dia"
                    : `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAll}
                disabled={unreadCount === 0 || markAll.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="unread">Não lidas</TabsTrigger>
                  <TabsTrigger value="alerts">Alertas</TabsTrigger>
                </TabsList>
                <div className="flex flex-1 flex-col sm:flex-row gap-2">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por título ou conteúdo…"
                    className="sm:max-w-xs"
                    aria-label="Buscar notificações"
                  />
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="sm:w-[180px]" aria-label="Filtrar por tipo">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      <SelectItem value="alert">Alerta</SelectItem>
                      <SelectItem value="work_order">Ordem de serviço</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                      <SelectItem value="broadcast">Comunicado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="sm:w-[160px]" aria-label="Filtrar por período">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todo o período</SelectItem>
                      <SelectItem value="1">Últimas 24h</SelectItem>
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>


              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              )}

              {error && (
                <QueryErrorState
                  message={`Não foi possível carregar as notificações: ${(error as Error).message}`}
                  onRetry={refetch}
                />
              )}

              {!isLoading && !error && (
                <TabsContent value={activeTab} className="mt-0">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center text-center gap-3 py-12">
                      <Bell className="h-10 w-10 text-muted-foreground/60" />
                      <div>
                        <p className="font-semibold text-foreground">Nenhuma notificação</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Quando houver alertas, ordens de serviço ou comunicados, eles aparecerão aqui.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-[60vh]">
                      <ul className="space-y-2 pr-3">
                        {pageItems.map((n) => (
                          <li
                            key={n.id}
                            className={cn(
                              "group relative flex items-start gap-3 rounded-2xl border p-4 transition-colors",
                              n.read
                                ? "bg-background border-border"
                                : "bg-primary/5 border-primary/20"
                            )}
                          >
                            <div
                              className={cn(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                n.type === "alert"
                                  ? "bg-destructive/10 text-destructive"
                                  : n.type === "work_order"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-primary/10 text-primary"
                              )}
                            >
                              {iconByType[n.type] ?? <Info className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {n.title}
                                </span>
                                {!n.read && (
                                  <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                                    Nova
                                  </Badge>
                                )}
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                  {labelByType[n.type] ?? n.type}
                                </Badge>
                              </div>
                              {n.body && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {n.body}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>
                                  {formatDistanceToNow(new Date(n.created_at), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>
                                {n.entity && n.entity_id && (
                                  <Link
                                    to={
                                      n.entity === "work_orders"
                                        ? "/ordens"
                                        : n.entity === "segments"
                                        ? `/segmento/${n.entity_id}`
                                        : n.entity === "alerts"
                                        ? "/alertas"
                                        : "#"
                                    }
                                    className="text-primary hover:underline"
                                  >
                                    Ver detalhes
                                  </Link>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {!n.read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => markRead.mutate(n.id)}
                                  disabled={markRead.isPending}
                                  aria-label="Marcar como lida"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(n.id)}
                                disabled={remove.isPending}
                                aria-label="Remover notificação"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Notificacoes;
