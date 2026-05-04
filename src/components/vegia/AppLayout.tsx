import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { FiltersProvider } from "@/contexts/FiltersContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

const RealtimeMount = () => { useRealtimeRefresh(); return null; };

export const AppLayout = () => (
  <FiltersProvider>
    <RealtimeMount />
  <div className="flex min-h-screen w-full bg-background">
    <Sidebar />
    <main className="flex-1 min-w-0">
      <Outlet />
    </main>
  </div>
  </FiltersProvider>
);
