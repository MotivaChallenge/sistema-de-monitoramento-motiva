import { Outlet } from "react-router-dom";
import { Sidebar, SidebarBody } from "./Sidebar";
import { FiltersProvider } from "@/contexts/FiltersContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";

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
              className="md:hidden fixed top-3 left-3 z-40 h-9 w-9 rounded-full bg-surface-low border border-border flex items-center justify-center text-foreground shadow-md"
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
      </div>
    </FiltersProvider>
  );
};
