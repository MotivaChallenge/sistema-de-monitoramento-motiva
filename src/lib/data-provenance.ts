/**
 * Origem (procedência) de cada dado exibido na plataforma.
 * A banca exige que estimativas orbitais nunca sejam confundidas
 * com medições contratuais de campo.
 */
export type DataOrigin =
  | "campo"        // medido em campo (levantamento ARTESP)
  | "satelite"     // estimado por satélite + modelo
  | "cv"           // detectado por visão computacional
  | "validado"     // estimativa confirmada em campo
  | "demo";        // dado demonstrativo / protótipo

export interface OriginMeta {
  label: string;
  short: string;
  description: string;
  /** Classes Tailwind semânticas (sem cores hardcoded). */
  className: string;
}

export const ORIGIN_META: Record<DataOrigin, OriginMeta> = {
  campo: {
    label: "MEDIDO EM CAMPO",
    short: "Campo",
    description: "Medição presencial registrada em levantamento de campo. Vale como evidência contratual.",
    className: "bg-primary/12 text-primary border-primary/25",
  },
  satelite: {
    label: "ESTIMADO POR SATÉLITE + MODELO",
    short: "Estimado",
    description:
      "Estimativa derivada de índices espectrais Sentinel-2 processados no Google Earth Engine e convertidos em altura por modelo calibrado. Não é medição direta.",
    className: "bg-secondary-container text-secondary-on-container border-border/60",
  },
  cv: {
    label: "DETECTADO POR VISÃO COMPUTACIONAL",
    short: "Visão computacional",
    description: "Detecção automática em imagem. Sujeita a falso positivo; exige revisão humana.",
    className: "bg-tertiary/12 text-tertiary border-tertiary/25",
  },
  validado: {
    label: "VALIDADO EM CAMPO",
    short: "Validado",
    description: "Estimativa remota confirmada presencialmente pela equipe.",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  demo: {
    label: "DADO DEMONSTRATIVO",
    short: "Demonstrativo",
    description: "Conteúdo de demonstração/protótipo. Não representa medição real.",
    className: "bg-muted text-muted-foreground border-border",
  },
};

/** Filtro de origem usado nas telas de listagem. */
export type OriginFilter = "todas" | DataOrigin | "pendente";

export const ORIGIN_FILTER_LABEL: Record<OriginFilter, string> = {
  todas: "Todas as origens",
  campo: "Somente medido em campo",
  satelite: "Somente estimado por satélite",
  cv: "Somente visão computacional",
  validado: "Somente validado em campo",
  demo: "Somente demonstrativo",
  pendente: "Pendentes de validação",
};

/** Segmentos vêm do pipeline orbital; quando houver roçada validada, marcamos como validado. */
export const segmentOrigin = (seg: { detection?: unknown; statusBanco?: string }): DataOrigin =>
  seg.detection ? "cv" : "satelite";

export const originMatchesFilter = (
  origin: DataOrigin,
  filter: OriginFilter,
  needsFieldValidation: boolean,
): boolean => {
  if (filter === "todas") return true;
  if (filter === "pendente") return needsFieldValidation;
  return origin === filter;
};

/** Mensagem institucional exibida nos painéis de fonte e no rodapé do relatório. */
export const POSITIONING_MESSAGE =
  "Usamos sensoriamento remoto e inteligência analítica para reduzir a área de busca, antecipar riscos e direcionar equipes. A decisão contratual permanece rastreável e, quando a estimativa está próxima do limite, o sistema encaminha o ponto para validação de campo.";
