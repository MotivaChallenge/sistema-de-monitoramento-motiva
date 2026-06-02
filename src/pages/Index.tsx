import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Leaf, Satellite, Brain, ShieldCheck, ArrowRight, Lock, CloudRain, Flame, Eye, TrendingDown, Route } from "lucide-react";
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

const Stat = ({ value, label, hint }: { value: string; label: string; hint?: string }) => (
  <div className="bg-surface-lowest rounded-2xl p-6 border border-border/40">
    <div className="text-[28px] md:text-[32px] font-bold tabular-nums leading-none">{value}</div>
    <div className="text-[13px] font-semibold mt-2">{label}</div>
    {hint && <div className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{hint}</div>}
  </div>
);

const FAQItem = ({ q, a }: { q: string; a: string }) => (
  <details className="group bg-surface-lowest rounded-xl border border-border/40 p-5 open:bg-surface-low transition-colors">
    <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
      <span className="text-[14px] font-semibold">{q}</span>
      <span className="text-muted-foreground text-[18px] leading-none group-open:rotate-45 transition-transform">+</span>
    </summary>
    <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">{a}</p>
  </details>
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

      <section className="px-8 md:px-14 max-w-[1200px] mx-auto pb-20">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tertiary/15 text-tertiary text-[11px] font-semibold tracking-wider uppercase mb-3">
              <TrendingDown className="h-3 w-3" /> Impacto operacional
            </span>
            <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight">Decisão baseada em dados, não em calendário.</h2>
            <p className="text-[14px] text-muted-foreground mt-2 max-w-[640px]">Roçadas são planejadas hoje em 13 a 18 ciclos anuais fixos. O Vegia substitui esse calendário por gatilhos dinâmicos de NDVI, clima e criticidade — eliminando intervenções desnecessárias e antecipando as urgentes.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <Stat value="13–18" label="Ciclos/ano hoje" hint="Padrão fixo de roçada manual + mecânica em rodovias concessionadas." />
          <Stat value="R$ 0,10–0,40" label="Custo por m²" hint="Faixa referencial entre roçada mecânica e manual. Priorizar por criticidade reduz a média." />
          <Stat value="–30%" label="Meta de redução" hint="Intervenções evitadas ao acionar equipes apenas quando NDVI e altura ultrapassam o limite contratual." />
          <Stat value="100%" label="LGPD-safe" hint="Solução baseada em satélite Sentinel-2 e visão computacional própria — sem uso de câmeras das rodovias." />
        </div>
      </section>

      <section className="px-8 md:px-14 max-w-[1200px] mx-auto pb-20">
        <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight mb-2">Por que vegetação é segurança, não estética.</h2>
        <p className="text-[14px] text-muted-foreground mb-8 max-w-[680px]">A manutenção do verde rodoviário impacta diretamente três dimensões críticas de operação.</p>
        <div className="grid md:grid-cols-3 gap-5">
          <Feature icon={Eye} title="Visibilidade e sinalização" desc="Vegetação alta em curvas, acostamentos e placas reduz tempo de reação e aumenta risco de acidente em trechos de alto tráfego." />
          <Feature icon={Flame} title="Prevenção de incêndios" desc="Massa vegetal seca em períodos de estiagem é vetor primário de queimadas que interditam pistas e danificam infraestrutura." />
          <Feature icon={ShieldCheck} title="Conservação de ativos" desc="Raízes e umidade comprometem drenagem, dispositivos de contenção e pavimento. Roçada preventiva preserva o ativo." />
        </div>
      </section>

      <section className="px-8 md:px-14 max-w-[1200px] mx-auto pb-20">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-secondary-on-container text-[11px] font-semibold tracking-wider uppercase mb-3">
              <Lock className="h-3 w-3" /> Compliance by design
            </span>
            <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight">Sem câmeras da rodovia. Sem risco LGPD.</h2>
            <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed">As câmeras de monitoramento de tráfego capturam placas, rostos e veículos — dados pessoais sensíveis sob a LGPD. O Vegia é arquitetado para nunca tocar nessa base. Toda inteligência vem de:</p>
            <ul className="mt-5 space-y-3 text-[13px]">
              <li className="flex gap-3"><Satellite className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span><b>Imagens de satélite Sentinel-2</b> (ESA) — domínio público, resolução de 10 m, revisita de 5 dias.</span></li>
              <li className="flex gap-3"><Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span><b>Visão computacional em imagens de inspeção</b> capturadas por equipes próprias, com governança total do dado.</span></li>
              <li className="flex gap-3"><CloudRain className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span><b>Dados climáticos</b> de fontes meteorológicas abertas, correlacionados ao crescimento da vegetação por trecho.</span></li>
              <li className="flex gap-3"><Route className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span><b>Histórico de tráfego e acidentes</b> (ANTT) para ponderar criticidade por KM.</span></li>
            </ul>
          </div>
          <div className="bg-surface-lowest rounded-2xl border border-border/40 p-6">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-4">Da inspeção programada à inspeção preditiva</div>
            <div className="space-y-4">
              {[
                { k: "Modelo atual", v: "Calendário fixo · auditoria por amostragem · envio reativo de equipes" },
                { k: "Camada Vegia", v: "NDVI por KM · classificação Nível 1/2/3 · IRC com clima e tráfego" },
                { k: "Resultado", v: "Priorização por criticidade · roteirização inteligente · auditoria fotográfica automática" },
              ].map((r, i) => (
                <div key={r.k} className="flex gap-4">
                  <div className="text-[11px] font-bold tabular-nums text-primary-glow w-6 pt-0.5">{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-wider">{r.k}</div>
                    <div className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{r.v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-8 md:px-14 max-w-[1200px] mx-auto pb-20">
        <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight mb-8">Perguntas frequentes</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <FAQItem q="Vocês usam as câmeras já instaladas na rodovia?" a="Não. Por restrição da LGPD e sensibilidade dos dados, o Vegia não consome imagens das câmeras de tráfego. Trabalhamos exclusivamente com satélite Sentinel-2 e visão computacional sobre fotos de inspeção própria." />
          <FAQItem q="Como o Vegia lida com baixa volumetria de dados históricos?" a="O modelo foi pensado para operar com incerteza: hipóteses explícitas, premissas auditáveis e fallback determinístico via classificação ARTESP. Conforme novos dados chegam, o IRC se recalibra automaticamente." />
          <FAQItem q="O custo de roçada varia muito. Como vocês estimam economia?" a="Usamos faixas referenciais (R$ 0,10–0,23/m² mecânica · R$ 0,20–0,40/m² manual) parametrizáveis por trecho. A economia vem de eliminar intervenções desnecessárias quando o NDVI ainda está dentro do limite contratual." />
          <FAQItem q="O clima é considerado nas recomendações?" a="Sim. Cada trecho tem previsão climática integrada (chuva, temperatura, umidade) que ajusta a janela ideal de roçada e antecipa picos de crescimento pós-chuva." />
          <FAQItem q="Como funciona a auditoria automatizada?" a="A inspeção em campo é registrada com geotag, foto e medições. O módulo de Análise CV classifica automaticamente cobertura, altura e conformidade, gerando relatório PDF auditável alinhado às exigências do Poder Concedente." />
          <FAQItem q="A solução é escalável para outras concessionárias?" a="Sim. A arquitetura é multi-tenant: novos trechos, contratos e KPIs são configurados via painel. O custo marginal por KM monitorado tende a zero conforme a malha cresce." />
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
