import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AppLayout } from "./components/vegia/AppLayout";
import Auth from "./pages/Auth";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/vegia/ProtectedRoute";
import { SettingsProvider } from "./hooks/useSettings";
import { lazy, Suspense, type ComponentType } from "react";

// Code splitting por rota — reduz bundle inicial.
// Após um novo deploy, os chunks antigos deixam de existir e o import dinâmico falha.
// Tentamos novamente uma vez e, se persistir, recarregamos a página (uma única vez).
const RELOAD_KEY = "chunk-reload-at";
function lazyWithRetry<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      try {
        return await factory();
      } catch (err2) {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          return new Promise<never>(() => {});
        }
        throw err2;
      }
    }
  });
}

const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Segmento = lazyWithRetry(() => import("./pages/Segmento"));
const Relatorio = lazyWithRetry(() => import("./pages/Relatorio"));
const AnaliseCV = lazyWithRetry(() => import("./pages/AnaliseCV"));
const Configuracoes = lazyWithRetry(() => import("./pages/Configuracoes"));
const Alertas = lazyWithRetry(() => import("./pages/Alertas"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Previsoes = lazyWithRetry(() => import("./pages/Previsoes"));
const Planejamento = lazyWithRetry(() => import("./pages/Planejamento"));
const Equipes = lazyWithRetry(() => import("./pages/Equipes"));
const Mapa = lazyWithRetry(() => import("./pages/Mapa"));
const OrdensServico = lazyWithRetry(() => import("./pages/OrdensServico"));
const Prototipo = lazyWithRetry(() => import("./pages/Prototipo"));
const Dataset = lazyWithRetry(() => import("./pages/Dataset"));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground text-sm">
    Carregando…
  </div>
);

import { toast as sonnerToast } from "sonner";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.query.state.status === "error") {
    const err = event.query.state.error as Error | undefined;
    sonnerToast.error("Falha ao carregar dados", { description: err?.message ?? "Tente novamente em instantes." });
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mapa" element={<Mapa />} />
              <Route path="/previsoes" element={<Previsoes />} />
              <Route path="/planejamento" element={<Planejamento />} />
              <Route path="/equipes" element={<Equipes />} />
              <Route path="/ordens" element={<OrdensServico />} />
              <Route path="/prototipo" element={<Prototipo />} />
              <Route path="/dataset" element={<Dataset />} />
              <Route path="/segmento/:id" element={<Segmento />} />
              <Route path="/relatorio" element={<Relatorio />} />
              <Route path="/alertas" element={<Alertas />} />
              <Route path="/analise-cv/:id" element={<AnaliseCV />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
