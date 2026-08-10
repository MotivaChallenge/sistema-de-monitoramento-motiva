import { Outlet } from "react-router-dom";
import { Sidebar, SidebarBody } from "./Sidebar";
import { FiltersProvider } from "@/contexts/FiltersContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";
import { DemoTour } from "./DemoTour";

const RealtimeMount = () => { useRealtimeRefresh(); return null; };

export const AppLayout = () => {
  const [open, setOpen] = useState(false);
  return (
    <FiltersProvider>
      <RealtimeMount />
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        {/* Mobile trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Abrir menu"
              className="md:hidden fixed top-4 right-4 z-50 h-10 w-10 rounded-full bg-surface-lowest border border-border flex items-center justify-center text-foreground shadow-elegant hover:bg-surface-low transition-smooth"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[220px] bg-sidebar border-sidebar-border">
            <SidebarBody onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
        <DemoTour />
      </div>
    </FiltersProvider>
  );
};
