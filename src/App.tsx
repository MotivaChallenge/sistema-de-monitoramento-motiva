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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/segmento/:id" element={<Segmento />} />
              <Route path="/relatorio" element={<Relatorio />} />
              <Route path="/analise-cv/:id" element={<AnaliseCV />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
