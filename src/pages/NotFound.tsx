import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-primary/15 text-primary-glow flex items-center justify-center">
          <Compass className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-[40px] font-bold tracking-tight mb-2">404</h1>
        <p className="text-muted-foreground mb-6">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="px-4 h-10 inline-flex items-center rounded-lg border border-border text-[12px] font-semibold uppercase tracking-wider hover:bg-surface-low">
            Página inicial
          </Link>
          <Link to="/dashboard" className="px-4 h-10 inline-flex items-center rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[12px] font-semibold uppercase tracking-wider">
            Abrir painel
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
