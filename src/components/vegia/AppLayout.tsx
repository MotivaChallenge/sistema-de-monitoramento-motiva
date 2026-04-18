import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const AppLayout = () => (
  <div className="flex min-h-screen w-full bg-background">
    <Sidebar />
    <main className="flex-1 min-w-0">
      <Outlet />
    </main>
  </div>
);
