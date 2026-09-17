import { Outlet } from "react-router-dom";
import { Sidebar, SidebarBody } from "./Sidebar";
import { FiltersProvider } from "@/contexts/FiltersContext";
import { MobileMenuContext } from "@/contexts/MobileMenuContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useState } from "react";

const RealtimeMount = () => { useRealtimeRefresh(); return null; };

export const AppLayout = () => {
  const [open, setOpen] = useState(false);
  return (
    <FiltersProvider>
      <MobileMenuContext.Provider value={{ open, setOpen }}>
        <RealtimeMount />
        <div className="flex min-h-screen w-full bg-surface-low">
          <Sidebar />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="p-0 w-[260px] max-w-[85vw] bg-sidebar border-sidebar-border">
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden bg-background md:my-2 md:mr-2 md:rounded-lg md:border md:border-border/50 md:shadow-card">
            <Outlet />
          </main>
        </div>
      </MobileMenuContext.Provider>
    </FiltersProvider>
  );
};
