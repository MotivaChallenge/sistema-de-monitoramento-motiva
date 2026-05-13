import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Leaf, Satellite, Brain, ShieldCheck, ArrowRight } from "lucide-react";
import logoMotiva from "@/assets/motiva-logo.png";

const Feature = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="bg-surface-lowest rounded-2xl p-6 border border-border/40">
    <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary-glow flex items-center justify-center mb-4">
      <Icon className="h-5 w-5" aria-hidden />
    </div>
    <h3 className="text-[16px] font-semibold mb-1.5">{title}</h3>
    <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);

const Index = () => {
  const { user } = useAuth();
  const cta = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? "Abrir painel" : "Entrar no painel";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="px-8 md:px-14 py-6 flex items-center justify-between max-w-[1200px] mx-auto">
        <div className="flex items-center gap-3">
          <img src={logoMotiva} alt="Motiva Rodovias" className="h-9 w-9 rounded-full" />
          <div className="leading-tight">
            <div className="text-[16px] font-extrabold tracking-tight">Vegia</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Motiva Rodovias</div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="text-[13px] font-medium text-muted-foreground hover:text-foreground">Entrar</Link>
          <Link to={cta} className="px-4 h-9 inline-flex items-center rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[12px] font-semibold tracking-wider uppercase">
            {ctaLabel}
          </Link>
        </nav>
      </header>

      <section className="px-8 md:px-14 max-w-[1200px] mx-auto pt-12 pb-20 md:pt-20 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-secondary-on-container text-[11px] font-semibold tracking-wider uppercase mb-5">
            <Leaf className="h-3 w-3" /> Conformidade ARTESP em tempo real
          </span>
          <h1 className="text-[40px] md:text-[54px] font-bold tracking-tight leading-[1.05]">
            Monitoramento de vegetação rodoviária com IA e satélite.
          </h1>
          <p className="mt-5 text-[16px] text-muted-foreground leading-relaxed max-w-[520px]">
            O Vegia une imagens Sentinel-2, visão computacional e dados de campo para
            antecipar roçadas, reduzir custos operacionais e garantir conformidade
            contratual em toda a malha da Motiva Rodovias.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={cta} className="px-5 h-11 inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold tracking-wider uppercase">
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="mailto:contato@motiva.com.br?subject=Vegia%20-%20Solicitar%20acesso" className="px-5 h-11 inline-flex items-center rounded-lg border border-border text-[13px] font-semibold tracking-wider uppercase hover:bg-surface-low">
              Solicitar acesso
            </a>
          </div>
          <div className="mt-8 flex items-center gap-6 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> NDVI Sentinel-2</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-tertiary" /> Visão computacional</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Alertas em tempo real</span>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/30 via-surface-low to-tertiary/20 border border-border/40 p-1">
            <div className="w-full h-full rounded-xl bg-surface-lowest p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Painel ao vivo · Rodoanel SP-021
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "NDVI", v: "0,72" },
                  { l: "Críticos", v: "3" },
                  { l: "IRC", v: "58" },
                ].map(c => (
                  <div key={c.l} className="bg-surface-high rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.l}</div>
                    <div className="text-[22px] font-bold tabular-nums">{c.v}</div>
                  </div>
                ))}
              </div>
              <div className="flex-1 rounded-lg bg-gradient-to-br from-primary/40 via-tertiary/30 to-destructive/20 grid place-items-center text-[11px] uppercase tracking-wider text-foreground/70">
                Mapa NDVI · Sentinel-2
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-8 md:px-14 max-w-[1200px] mx-auto pb-20">
        <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight mb-8">Tudo que a operação precisa, em um só painel.</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <Feature icon={Satellite} title="NDVI Sentinel-2" desc="Leituras periódicas de cobertura vegetal por trecho de KM, com tendência e alertas automáticos." />
          <Feature icon={Brain} title="IA contextual" desc="Insights operacionais por trecho usando Lovable AI: clima, histórico e recomendação de roçada." />
          <Feature icon={ShieldCheck} title="Conformidade ARTESP" desc="Relatórios PDF auditáveis, classificação Nível 1/2/3 e cálculo automático do índice de risco." />
        </div>
      </section>

      <footer className="border-t border-border/50">
        <div className="px-8 md:px-14 max-w-[1200px] mx-auto py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logoMotiva} alt="" className="h-5 w-5 rounded-full" />
            <span>© {new Date().getFullYear()} Motiva Rodovias · Vegia</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="hover:text-foreground">Entrar</Link>
            <a href="mailto:contato@motiva.com.br" className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
