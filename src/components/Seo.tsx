import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE = "https://sistema-de-monitoramento-motiva.lovable.app";
const SITE_NAME = "Motiva · Monitoramento de Vegetação";

interface SeoProps {
  /** Título específico da rota (sem o nome do site). */
  title: string;
  /** Descrição específica da rota (até ~155 caracteres). */
  description: string;
  /** Caminho canônico — por padrão usa a rota atual. */
  path?: string;
  /** Rotas internas do painel não devem ser indexadas. */
  noindex?: boolean;
}

/** Metadados de head por rota: título, descrição, canonical e Open Graph auto-referentes. */
export const Seo = ({ title, description, path, noindex = true }: SeoProps) => {
  const location = useLocation();
  const route = path ?? location.pathname;
  const url = `${SITE}${route}`;
  const fullTitle = `${title} · ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
};
