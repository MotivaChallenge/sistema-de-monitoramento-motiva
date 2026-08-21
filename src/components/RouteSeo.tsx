import { useLocation } from "react-router-dom";
import { Seo } from "./Seo";

interface Meta {
  title: string;
  description: string;
  /** Rotas públicas (login) podem ser indexadas; o painel interno não. */
  noindex?: boolean;
}

const STATIC: Record<string, Meta> = {
  "/": {
    title: "Acesso ao painel",
    description: "Entre no painel de monitoramento de vegetação rodoviária da Motiva para acompanhar NDVI, criticidade e ordens de serviço.",
  },
  "/auth": {
    title: "Acesso ao painel",
    description: "Entre no painel de monitoramento de vegetação rodoviária da Motiva para acompanhar NDVI, criticidade e ordens de serviço.",
  },
  "/reset-password": {
    title: "Redefinir senha",
    description: "Defina uma nova senha de acesso ao painel de monitoramento de vegetação rodoviária.",
  },
  "/dashboard": {
    title: "Painel operacional",
    description: "Visão consolidada da malha: clima, criticidade por trecho, tendência de NDVI, alertas ativos e capacidade das equipes.",
  },
  "/mapa": {
    title: "Mapa operacional",
    description: "Mapa da malha rodoviária com trechos por status, camadas de ordens de serviço e análise orbital ponto a ponto.",
  },
  "/previsoes": {
    title: "Previsões de crescimento",
    description: "Projeção de crescimento da vegetação por trecho a partir de NDVI, chuva acumulada e histórico de roçadas.",
  },
  "/planejamento": {
    title: "Planejamento de roçada",
    description: "Priorização de trechos por índice de risco e programação de intervenções conforme a capacidade das equipes.",
  },
  "/equipes": {
    title: "Equipes de campo",
    description: "Cadastro, disponibilidade, região de atuação e capacidade diária das equipes de roçada.",
  },
  "/ordens": {
    title: "Ordens de serviço",
    description: "Abertura, acompanhamento e conclusão de ordens de serviço de roçada por trecho e equipe.",
  },
  "/prototipo": {
    title: "Validação de modelo",
    description: "Comparação entre altura estimada por satélite e medições de campo, com MAE, RMSE e R².",
  },
  "/dataset": {
    title: "Simulação de dados",
    description: "Geração determinística de séries de NDVI, altura estimada, roçadas e prazos contratuais para análise.",
  },
  "/relatorio": {
    title: "Relatório de conformidade",
    description: "Conformidade contratual por levantamento ARTESP, com níveis de vegetação medidos e pontos críticos.",
  },
  "/alertas": {
    title: "Alertas da malha",
    description: "Histórico de mudanças de status dos trechos monitorados, com criticidade e trecho de origem.",
  },
  "/configuracoes": {
    title: "Configurações",
    description: "Pesos do índice de risco, limiares de altura, notificações e preferências de exibição do painel.",
  },
};

const PREFIX: { test: RegExp; meta: (m: RegExpMatchArray) => Meta }[] = [
  {
    test: /^\/segmento\/(.+)$/,
    meta: m => ({
      title: `Trecho ${m[1]}`,
      description: `Detalhes do trecho ${m[1]}: NDVI, altura estimada, cláusula contratual, histórico de roçadas e recomendações.`,
    }),
  },
  {
    test: /^\/analise-cv\/(.+)$/,
    meta: m => ({
      title: `Análise visual do trecho ${m[1]}`,
      description: `Detecções de visão computacional e medições ARTESP vinculadas ao trecho ${m[1]}.`,
    }),
  },
];

/** Aplica título, descrição, canonical e Open Graph próprios a cada rota. */
export const RouteSeo = () => {
  const { pathname } = useLocation();
  const path = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  let meta = STATIC[path];
  if (!meta) {
    for (const p of PREFIX) {
      const m = path.match(p.test);
      if (m) { meta = p.meta(m); break; }
    }
  }
  if (!meta) {
    meta = {
      title: "Página não encontrada",
      description: "A página solicitada não existe no painel de monitoramento de vegetação rodoviária.",
    };
  }

  const isPublic = path === "/" || path === "/auth";
  return <Seo title={meta.title} description={meta.description} path={path} noindex={meta.noindex ?? !isPublic} />;
};
