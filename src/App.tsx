import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AppLayout } from "./components/vegia/AppLayout";
import Dashboard from "./pages/Dashboard";
import Segmento from "./pages/Segmento";
import Relatorio from "./pages/Relatorio";
import AnaliseCV from "./pages/AnaliseCV";
import Auth from "./pages/Auth";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/vegia/ProtectedRoute";
import { SettingsProvider } from "./hooks/useSettings";
import Configuracoes from "./pages/Configuracoes";

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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/segmento/:id" element={<Segmento />} />
              <Route path="/relatorio" element={<Relatorio />} />
              <Route path="/analise-cv/:id" element={<AnaliseCV />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
