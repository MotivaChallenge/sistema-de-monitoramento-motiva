import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AppLayout } from "./components/vegia/AppLayout";
import Auth from "./pages/Auth";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/vegia/ProtectedRoute";
import { SettingsProvider } from "./hooks/useSettings";
import { lazy, Suspense } from "react";

// Code splitting por rota — reduz bundle inicial.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Segmento = lazy(() => import("./pages/Segmento"));
const Relatorio = lazy(() => import("./pages/Relatorio"));
const AnaliseCV = lazy(() => import("./pages/AnaliseCV"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Alertas = lazy(() => import("./pages/Alertas"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Previsoes = lazy(() => import("./pages/Previsoes"));
const Planejamento = lazy(() => import("./pages/Planejamento"));
const Equipes = lazy(() => import("./pages/Equipes"));
const ROI = lazy(() => import("./pages/ROI"));
const Integracoes = lazy(() => import("./pages/Integracoes"));
const Mapa = lazy(() => import("./pages/Mapa"));

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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mapa" element={<Dashboard />} />
              <Route path="/previsoes" element={<Previsoes />} />
              <Route path="/planejamento" element={<Planejamento />} />
              <Route path="/equipes" element={<Equipes />} />
              <Route path="/roi" element={<ROI />} />
              <Route path="/integracoes" element={<Integracoes />} />
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
