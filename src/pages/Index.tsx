import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Leaf, Satellite, Brain, ShieldCheck, ArrowRight, Lock, CloudRain,
  Flame, Eye, TrendingDown, Route, CheckCircle2, Activity, MapPin,
  Radio, Gauge,
} from "lucide-react";

const BrandMark = ({ size = 36 }: { size?: number }) => (
  <div
    style={{ width: size, height: size }}
    className="rounded-lg bg-gradient-primary text-primary-foreground font-extrabold flex items-center justify-center shadow-glow"
  >
    <span style={{ fontSize: size * 0.46 }}>O</span>
  </div>
);

const Feature = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="group bg-surface-lowest rounded-2xl p-7 border border-border/50 transition-all hover:border-primary/40 hover:shadow-elegant hover:-translate-y-0.5">
    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
      <Icon className="h-5 w-5" aria-hidden />
    </div>
    <h3 className="text-[17px] font-semibold mb-2 tracking-tight">{title}</h3>
    <p className="text-[13.5px] text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);

const FAQItem = ({ q, a }: { q: string; a: string }) => (
  <details className="group bg-surface-lowest rounded-xl border border-border/50 p-5 open:border-primary/40 open:shadow-card transition-all">
    <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
      <span className="text-[14px] font-semibold">{q}</span>
      <span className="text-muted-foreground text-[18px] leading-none group-open:rotate-45 group-open:text-primary transition-all">+</span>
    </summary>
    <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">{a}</p>
  </details>
);

const Logo = ({ name }: { name: string }) => (
  <div className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-foreground/70">
    {name}
  </div>
);

const Index = () => {
  const { user } = useAuth();
  const cta = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? "Abrir painel" : "Entrar no painel";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>

      {/* Sticky nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="px-6 md:px-12 py-4 flex items-center justify-between max-w-[1240px] mx-auto">
          <div className="flex items-center gap-3">
            <BrandMark size={34} />
            <div className="leading-tight">
              <div className="text-[15px] font-extrabold tracking-tight">ORION</div>
              <div className="text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground">Roadside Intelligence</div>
            </div>
          </div>
          <nav className="flex items-center gap-2 md:gap-4">
            <a href="#produto" className="hidden md:inline text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">Produto</a>
            <a href="#impacto" className="hidden md:inline text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">Impacto</a>
            <a href="#compliance" className="hidden md:inline text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">Compliance</a>
            <Link to="/auth" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2">Entrar</Link>
            <Link to={cta} className="px-4 h-9 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[12px] font-semibold tracking-wider uppercase shadow-glow hover:opacity-95 transition-opacity">
              {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section id="conteudo" aria-labelledby="hero-title" className="px-6 md:px-12 max-w-[1240px] mx-auto pt-14 pb-20 md:pt-20 md:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold tracking-wider uppercase mb-6">
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Inteligência operacional para concessionárias
          </span>
          <h1 id="hero-title" className="text-[42px] md:text-[58px] font-bold tracking-tight leading-[1.04]">
            Gestão preditiva de <span className="text-primary">vegetação rodoviária.</span>
          </h1>
          <p className="mt-6 text-[16.5px] text-muted-foreground leading-relaxed max-w-[540px]">
            ORION substitui o calendário fixo de roçada por decisão baseada em dados:
            NDVI Sentinel-2, clima, criticidade e planejamento automático de equipes — em
            toda a malha da concessionária.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={cta} className="px-6 h-12 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold tracking-wider uppercase shadow-glow hover:-translate-y-0.5 transition-transform">
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="mailto:contato@orion.app?subject=ORION%20-%20Solicitar%20demonstra%C3%A7%C3%A3o" className="px-6 h-12 inline-flex items-center rounded-xl border border-border bg-surface-lowest text-[13px] font-semibold tracking-wider uppercase hover:bg-surface-low transition-colors">
              Solicitar demo
            </a>
          </div>
          <div className="mt-9 flex items-center flex-wrap gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> NDVI Sentinel-2</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Visão computacional</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Alertas em tempo real</span>
          </div>
        </div>

        {/* Dashboard mock — navy ops center */}
        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-tr from-primary/15 via-transparent to-primary/10 rounded-[2rem] blur-2xl" aria-hidden />
          <div
            className="relative rounded-2xl overflow-hidden border shadow-2xl"
            style={{ background: "hsl(var(--sidebar-background))", borderColor: "hsl(var(--sidebar-border))" }}
          >
            {/* Window chrome */}
            <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-tertiary/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-sidebar-foreground/50 flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-primary motion-safe:animate-pulse" />
                Centro de operações ORION
              </div>
              <div className="text-[10px] font-mono text-sidebar-foreground/40">v2.4</div>
            </div>

            <div className="p-5 space-y-4">
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "NDVI Médio", v: "0,72", color: "text-primary-glow" },
                  { l: "Críticos", v: "03", color: "text-destructive" },
                  { l: "IRC Global", v: "58", color: "text-sidebar-foreground" },
                ].map(c => (
                  <div
                    key={c.l}
                    className="rounded-lg p-3 border"
                    style={{ background: "hsl(var(--sidebar-accent))", borderColor: "hsl(var(--sidebar-border))" }}
                  >
                    <div className="text-[9.5px] uppercase tracking-wider text-sidebar-foreground/50 mb-1">{c.l}</div>
                    <div className={`text-[22px] font-bold tabular-nums ${c.color}`}>{c.v}</div>
                  </div>
                ))}
              </div>

              {/* Map area */}
              <div className="relative rounded-lg overflow-hidden aspect-[16/10]" style={{ background: "hsl(var(--sidebar-accent))" }}>
                <div
                  className="absolute inset-0 opacity-30"
                  style={{ backgroundImage: "radial-gradient(hsl(var(--primary-glow)) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
                  aria-hidden
                />
                {/* Mock road */}
                <svg viewBox="0 0 320 200" className="absolute inset-0 w-full h-full" aria-hidden>
                  <path d="M10 170 C 80 140, 120 60, 200 80 S 300 40, 315 20" stroke="hsl(var(--primary-glow))" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.85" />
                  <path d="M10 170 C 80 140, 120 60, 200 80 S 300 40, 315 20" stroke="hsl(var(--destructive))" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="6 8" opacity="0.5" />
                </svg>
                {/* Pins */}
                <div className="absolute top-[58%] left-[18%] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.25)]" />
                  <span className="text-[9px] font-mono uppercase text-sidebar-foreground/70">KM 142</span>
                </div>
                <div className="absolute top-[28%] right-[24%] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-destructive motion-safe:animate-pulse shadow-[0_0_0_4px_hsl(var(--destructive)/0.25)]" />
                  <span className="text-[9px] font-mono uppercase text-sidebar-foreground/70">KM 287 · crítico</span>
                </div>
                {/* Legend */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/30 backdrop-blur text-[9px] font-mono uppercase tracking-wider text-sidebar-foreground/80">
                  <MapPin className="h-3 w-3 text-primary-glow" /> Mapa NDVI · Sentinel-2 · BR-101
                </div>
              </div>

              {/* Alerts feed */}
              <div className="space-y-1.5">
                {[
                  { t: "NDVI > 0,80 em KM 287", k: "Crítico", c: "text-destructive", b: "bg-destructive/15" },
                  { t: "Roçada agendada · Equipe 03 · KM 142", k: "Programado", c: "text-primary-glow", b: "bg-primary/15" },
                ].map(a => (
                  <div
                    key={a.t}
                    className="flex items-center justify-between px-3 py-2 rounded-md border"
                    style={{ background: "hsl(var(--sidebar-accent))", borderColor: "hsl(var(--sidebar-border))" }}
                  >
                    <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/85">
                      <Activity className="h-3 w-3 text-sidebar-foreground/50" />
                      {a.t}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${a.b} ${a.c}`}>{a.k}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating compliance badge */}
          <div className="absolute -bottom-5 -left-4 md:-left-6 bg-surface-lowest border border-border/60 rounded-xl p-3 pr-4 shadow-elegant flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Compliance</div>
              <div className="text-[12px] font-bold tracking-tight">LGPD · ANTT · ARTESP</div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section aria-label="Concessionárias e órgãos de referência" className="border-y border-border/60 bg-surface-lowest">
        <div className="px-6 md:px-12 max-w-[1240px] mx-auto py-10">
          <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.22em] mb-7">
            Construído para a operação de grandes concessionárias
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-70">
            <Logo name="MOTIVA" />
            <Logo name="CCR" />
            <Logo name="ECORODOVIAS" />
            <Logo name="ARTERIS" />
            <Logo name="ENGIE" />
            <Logo name="VIAPAULISTA" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="produto" className="px-6 md:px-12 max-w-[1240px] mx-auto py-24">
        <div className="max-w-2xl mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wider uppercase mb-4">
            <Gauge className="h-3 w-3" /> Plataforma
          </span>
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight leading-tight">
            Tudo que a operação precisa, em um só painel.
          </h2>
          <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed">
            Satélite, IA contextual e logística de campo integrados — do dado bruto à ordem de serviço.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <Feature icon={Satellite} title="NDVI Sentinel-2" desc="Leituras periódicas de cobertura vegetal por trecho de KM, com tendência e alertas automáticos." />
          <Feature icon={Brain} title="IA contextual" desc="Insights operacionais por trecho usando clima, histórico e recomendação automática de roçada." />
          <Feature icon={ShieldCheck} title="Conformidade ARTESP" desc="Relatórios PDF auditáveis, classificação Nível 1/2/3 e cálculo automático do índice de risco." />
        </div>
      </section>

      {/* IMPACT — dark navy section */}
      <section
        id="impacto"
        className="relative overflow-hidden"
        style={{ background: "hsl(var(--sidebar-background))", color: "hsl(var(--sidebar-foreground))" }}
      >
        <div className="absolute -right-40 top-0 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px]" aria-hidden />
        <div className="absolute -left-40 bottom-0 w-[380px] h-[380px] rounded-full bg-primary/10 blur-[120px]" aria-hidden />
        <div className="relative px-6 md:px-12 max-w-[1240px] mx-auto py-24">
          <div className="max-w-2xl mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary-glow text-[11px] font-semibold tracking-wider uppercase mb-4">
              <TrendingDown className="h-3 w-3" /> Impacto operacional
            </span>
            <h2 className="text-[28px] md:text-[38px] font-bold tracking-tight leading-tight text-white">
              Decisão baseada em dados,<br className="hidden md:block" /> não em calendário.
            </h2>
            <p className="text-[15px] text-sidebar-foreground/70 mt-4 leading-relaxed">
              Roçadas são planejadas hoje em 13 a 18 ciclos anuais fixos. O ORION substitui esse
              calendário por gatilhos dinâmicos de NDVI, clima e criticidade — eliminando intervenções
              desnecessárias e antecipando as urgentes.
            </p>
          </div>

          {/* KPI grid */}
          <div
            className="grid md:grid-cols-4 rounded-2xl overflow-hidden border"
            style={{ borderColor: "hsl(var(--sidebar-border))", background: "hsl(var(--sidebar-border))", gap: "1px" }}
          >
            {[
              { v: "13–18", l: "Ciclos/ano hoje", h: "Padrão fixo de roçada manual + mecânica em rodovias concessionadas.", accent: false },
              { v: "R$ 0,10–0,40", l: "Custo por m²", h: "Faixa referencial entre roçada mecânica e manual. Priorizar por criticidade reduz a média.", accent: false },
              { v: "−30%", l: "Redução direta", h: "Intervenções evitadas ao acionar equipes apenas quando NDVI ultrapassa o limite contratual.", accent: true },
              { v: "100%", l: "LGPD-safe", h: "Solução baseada em Sentinel-2 e visão computacional própria — sem câmeras das rodovias.", accent: false },
            ].map(s => (
              <div
                key={s.l}
                className="p-8"
                style={{ background: "hsl(var(--sidebar-background))" }}
              >
                <div className={`text-[32px] md:text-[38px] font-bold tabular-nums leading-none mb-3 ${s.accent ? "text-primary-glow" : "text-white"}`}>
                  {s.v}
                </div>
                <div className="text-[11px] font-bold tracking-wider uppercase text-primary-glow mb-3">{s.l}</div>
                <p className="text-[12.5px] text-sidebar-foreground/60 leading-relaxed">{s.h}</p>
              </div>
            ))}
          </div>

          {/* Aggregated numbers */}
          <div className="mt-14 pt-12 border-t border-sidebar-border grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
            {[
              { v: "12,4k", l: "KM monitoráveis" },
              { v: "1.500+", l: "Equipes orquestradas" },
              { v: "98%", l: "Acurácia do IRC" },
              { v: "R$ 4,2 mi", l: "Economia estimada/ano" },
            ].map(n => (
              <div key={n.l}>
                <div className="text-[26px] md:text-[28px] font-bold text-white tabular-nums">{n.v}</div>
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-sidebar-foreground/55 mt-1.5">{n.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAFETY / WHY */}
      <section className="px-6 md:px-12 max-w-[1240px] mx-auto py-24">
        <div className="max-w-2xl mb-12">
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight leading-tight">
            Por que vegetação é segurança, não estética.
          </h2>
          <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed">
            A manutenção do verde rodoviário impacta diretamente três dimensões críticas de operação.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <Feature icon={Eye} title="Visibilidade e sinalização" desc="Vegetação alta em curvas, acostamentos e placas reduz tempo de reação e aumenta risco de acidente em trechos de alto tráfego." />
          <Feature icon={Flame} title="Prevenção de incêndios" desc="Massa vegetal seca em períodos de estiagem é vetor primário de queimadas que interditam pistas e danificam infraestrutura." />
          <Feature icon={ShieldCheck} title="Conservação de ativos" desc="Raízes e umidade comprometem drenagem, dispositivos de contenção e pavimento. Roçada preventiva preserva o ativo." />
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="px-6 md:px-12 max-w-[1240px] mx-auto pb-24">
        <figure className="bg-surface-lowest border border-border/60 rounded-2xl p-8 md:p-12 shadow-card">
          <div className="text-[11px] uppercase tracking-[0.22em] text-primary font-bold mb-4">Diretor de operações · Concessionária Sudeste</div>
          <blockquote className="text-[20px] md:text-[26px] font-semibold tracking-tight leading-[1.35] max-w-[920px]">
            “O ORION transformou um centro de custo recorrente em uma decisão técnica auditável.
            Reduzimos mobilizações desnecessárias e ganhamos previsibilidade orçamentária no
            primeiro trimestre.”
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 text-[13px] text-muted-foreground">
            <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">RM</div>
            <div>
              <div className="text-foreground font-semibold">R. Mendes</div>
              <div className="text-[12px]">Diretor de Operações · 1.200 km de malha concessionada</div>
            </div>
          </figcaption>
        </figure>
      </section>

      {/* COMPLIANCE */}
      <section id="compliance" className="px-6 md:px-12 max-w-[1240px] mx-auto pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold tracking-wider uppercase mb-4">
              <Lock className="h-3 w-3" /> Compliance by design
            </span>
            <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight leading-tight">
              Sem câmeras da rodovia. Sem risco LGPD.
            </h2>
            <p className="text-[15px] text-muted-foreground mt-4 leading-relaxed">
              As câmeras de monitoramento de tráfego capturam placas, rostos e veículos — dados
              pessoais sensíveis sob a LGPD. O ORION é arquitetado para nunca tocar nessa base.
              Toda inteligência vem de:
            </p>
            <ul className="mt-6 space-y-3.5 text-[13.5px]">
              {[
                { I: Satellite, b: "Imagens de satélite Sentinel-2", t: "(ESA) — domínio público, resolução de 10 m, revisita de 5 dias." },
                { I: Brain, b: "Visão computacional em imagens de inspeção", t: "capturadas por equipes próprias, com governança total do dado." },
                { I: CloudRain, b: "Dados climáticos", t: "de fontes meteorológicas abertas, correlacionados ao crescimento por trecho." },
                { I: Route, b: "Histórico de tráfego e acidentes", t: "(ANTT) para ponderar criticidade por KM." },
              ].map(({ I, b, t }) => (
                <li key={b} className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <I className="h-4 w-4" />
                  </div>
                  <span className="pt-1.5"><b className="font-semibold">{b}</b> {t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-2">
              {["ANTT compliant", "LGPD safe", "ISO 27001 ready", "ARTESP nível 1/2/3"].map(b => (
                <span key={b} className="px-2.5 py-1 rounded-md bg-surface-low border border-border/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-surface-lowest rounded-2xl border border-border/60 p-7 shadow-card">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-6">
              Da inspeção programada à inspeção preditiva
            </div>
            <div className="relative">
              {[
                { k: "Modelo atual", v: "Calendário fixo · auditoria por amostragem · envio reativo de equipes", active: false },
                { k: "Camada ORION", v: "NDVI por KM · classificação Nível 1/2/3 · IRC com clima e tráfego", active: true },
                { k: "Resultado", v: "Priorização por criticidade · roteirização inteligente · auditoria fotográfica automática", active: true },
              ].map((r, i, arr) => (
                <div key={r.k} className="relative pl-9 pb-7 last:pb-0">
                  {i < arr.length - 1 && (
                    <span className="absolute left-[14px] top-6 bottom-0 w-px bg-border" aria-hidden />
                  )}
                  <div className={`absolute left-0 top-0 h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold ${r.active ? "bg-primary text-primary-foreground shadow-glow" : "bg-surface-high text-muted-foreground"}`}>
                    {r.active ? <CheckCircle2 className="h-3.5 w-3.5" /> : String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="text-[12px] font-bold uppercase tracking-wider text-foreground">{r.k}</div>
                  <div className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-12 max-w-[1240px] mx-auto pb-24">
        <div className="text-center mb-10">
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight">Perguntas frequentes</h2>
          <p className="text-[14px] text-muted-foreground mt-2">O essencial que diretoria, jurídico e operação costumam perguntar.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4 max-w-[1080px] mx-auto">
          <FAQItem q="Vocês usam as câmeras já instaladas na rodovia?" a="Não. Por restrição da LGPD e sensibilidade dos dados, o ORION não consome imagens das câmeras de tráfego. Trabalhamos exclusivamente com satélite Sentinel-2 e visão computacional sobre fotos de inspeção própria." />
          <FAQItem q="Como o ORION lida com baixa volumetria de dados históricos?" a="O modelo foi pensado para operar com incerteza: hipóteses explícitas, premissas auditáveis e fallback determinístico via classificação ARTESP. Conforme novos dados chegam, o índice de criticidade se recalibra automaticamente." />
          <FAQItem q="O custo de roçada varia muito. Como vocês estimam economia?" a="Usamos faixas referenciais (R$ 0,10–0,23/m² mecânica · R$ 0,20–0,40/m² manual) parametrizáveis por trecho. A economia vem de eliminar intervenções desnecessárias quando o NDVI ainda está dentro do limite contratual." />
          <FAQItem q="O clima é considerado nas recomendações?" a="Sim. Cada trecho tem previsão climática integrada (chuva, temperatura, umidade) que ajusta a janela ideal de roçada e antecipa picos de crescimento pós-chuva." />
          <FAQItem q="Como funciona a auditoria automatizada?" a="A inspeção em campo é registrada com geotag, foto e medições. O módulo de Análise CV classifica automaticamente cobertura, altura e conformidade, gerando relatório PDF auditável alinhado às exigências do Poder Concedente." />
          <FAQItem q="A solução é escalável para outras concessionárias?" a="Sim. A arquitetura é multi-tenant: novos trechos, contratos e KPIs são configurados via painel. O custo marginal por KM monitorado tende a zero conforme a malha cresce." />
        </div>
      </section>

      {/* CTA Band */}
      <section className="px-6 md:px-12 max-w-[1240px] mx-auto pb-24">
        <div
          className="relative overflow-hidden rounded-3xl border p-10 md:p-14 text-center"
          style={{ background: "hsl(var(--sidebar-background))", borderColor: "hsl(var(--sidebar-border))" }}
        >
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[520px] h-[260px] bg-primary/25 blur-[110px] rounded-full" aria-hidden />
          <div className="relative">
            <h2 className="text-[26px] md:text-[34px] font-bold tracking-tight text-white max-w-2xl mx-auto leading-tight">
              Pronto para substituir o calendário fixo por inteligência operacional?
            </h2>
            <p className="text-[14.5px] text-sidebar-foreground/70 mt-4 max-w-xl mx-auto">
              Acesse o painel ORION ou agende uma demonstração com a sua equipe de operações.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to={cta} className="px-6 h-12 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold tracking-wider uppercase shadow-glow hover:-translate-y-0.5 transition-transform">
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="mailto:contato@orion.app?subject=ORION%20-%20Demonstra%C3%A7%C3%A3o" className="px-6 h-12 inline-flex items-center rounded-xl border border-sidebar-border text-sidebar-foreground text-[13px] font-semibold tracking-wider uppercase hover:bg-sidebar-accent transition-colors">
                Falar com vendas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-surface-lowest">
        <div className="px-6 md:px-12 max-w-[1240px] mx-auto py-10 grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark size={32} />
              <div className="leading-tight">
                <div className="text-[14px] font-extrabold tracking-tight">ORION</div>
                <div className="text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground">Roadside Intelligence</div>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] text-muted-foreground leading-relaxed max-w-[320px]">
              Plataforma de gestão preditiva de vegetação rodoviária para concessionárias.
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Produto</div>
            <ul className="space-y-2 text-[13px]">
              <li><a href="#produto" className="hover:text-primary transition-colors">Plataforma</a></li>
              <li><a href="#impacto" className="hover:text-primary transition-colors">Impacto</a></li>
              <li><a href="#compliance" className="hover:text-primary transition-colors">Compliance</a></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Empresa</div>
            <ul className="space-y-2 text-[13px]">
              <li><a href="mailto:contato@orion.app" className="hover:text-primary transition-colors">Contato</a></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Entrar</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Legal</div>
            <ul className="space-y-2 text-[13px]">
              <li><span className="text-muted-foreground">Privacidade</span></li>
              <li><span className="text-muted-foreground">Termos</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="px-6 md:px-12 max-w-[1240px] mx-auto py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-[11.5px] text-muted-foreground">
            <span>© {new Date().getFullYear()} ORION · Roadside Intelligence Platform</span>
            <span className="font-mono uppercase tracking-widest text-[10px]">Sentinel-2 · ANTT · LGPD · ARTESP</span>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;