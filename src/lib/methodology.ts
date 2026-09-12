import { HEIGHT_MODEL_ID, HEIGHT_MODEL_UPDATED_AT, HEIGHT_MODEL_VERSION, MODEL_UNCERTAINTY_CM, SATELLITE_DISCLAIMER } from "@/lib/uncertainty";
import { heightModelSummary } from "@/lib/height-model";
import { POSITIONING_MESSAGE } from "@/lib/data-provenance";
import {
  MODEL_METHOD_TEXT, NON_CONFORMITY_TEXT, SATELLITE_NOT_A_RULER_TEXT,
  UNCERTAINTY_EXPLANATION_TEXT, VEGETATION_MODEL,
} from "@/lib/vegetation-model";


export interface MethodologySection {
  title: string;
  items: string[];
}

/** Fonte única da metodologia — usada na interface e no anexo técnico do PDF. */
export const METHODOLOGY_SECTIONS: MethodologySection[] = [
  {
    title: "Captura e fonte das imagens",
    items: [
      "Fonte principal: Sentinel-2 SR Harmonized (COPERNICUS/S2_SR_HARMONIZED), missão óptica da ESA.",
      "Processamento: Google Earth Engine, executado sob demanda por Edge Function autenticada.",
      "Filtro de nuvens: CLOUDY_PIXEL_PERCENTAGE < 60 na seleção das cenas.",
      "Máscara: banda SCL do Sentinel-2, mantendo apenas as classes 4, 5, 6, 7 e 11 (vegetação, solo exposto, água, nuvem baixa improvável e neve).",
      "Composição: mediana temporal das cenas válidas do período analisado.",
      "Resolução nativa: aproximadamente 10 m por pixel. Buffer analisado ao redor do ponto: 150 m (estatística zonal em 10 m).",
    ],
  },
  {
    title: "Índices espectrais utilizados",
    items: [
      "NDVI — vigor e cobertura vegetal; base do modelo de altura.",
      "EVI — reduz saturação em vegetação densa e influência atmosférica.",
      "SAVI — corrige o efeito do solo exposto em coberturas esparsas (L = 0,5).",
      "Estatística zonal por segmento: média, mediana, mínimo, máximo, desvio-padrão e contagem de pixels válidos.",
    ],
  },
  {
    title: "Grade experimental de 5 m",
    items: [
      "Quando o modo experimental de 5 m está ativo, o dado é reamostrado (bilinear ou vizinho mais próximo) a partir da grade nativa de 10 m.",
      "Reamostragem NÃO cria informação nova e NÃO representa precisão espacial real de 5 m. O uso é apenas de visualização.",
    ],
  },
  {
    title: "Modelo demonstrativo composto (NDVI + EVI + SAVI)",
    items: [
      SATELLITE_NOT_A_RULER_TEXT,
      MODEL_METHOD_TEXT,
      `Prioridade operacional = ${VEGETATION_MODEL.priorityWeights.heightRisk} × risco de altura + ${VEGETATION_MODEL.priorityWeights.ndvi} × NDVI + ${VEGETATION_MODEL.priorityWeights.rainfall} × chuva acumulada em 5 dias + ${VEGETATION_MODEL.priorityWeights.daysSinceMowing} × dias desde a última roçada, apresentada em escala 0–100.`,
      `Limite contratual geral parametrizado: ${VEGETATION_MODEL.contractualHeightLimitCm} cm. Incerteza demonstrativa: ± ${VEGETATION_MODEL.uncertainty.valueCm} cm (método ${VEGETATION_MODEL.uncertainty.method}, validação ${VEGETATION_MODEL.uncertainty.validationStatus === "pending" ? "pendente" : "concluída"}).`,
      UNCERTAINTY_EXPLANATION_TEXT,
      NON_CONFORMITY_TEXT,
      `Evolução prevista do modelo: ${VEGETATION_MODEL.heightCalibration.futureForm}.`,
    ],
  },
  {
    title: "Estimativa de altura",
    items: [
      SATELLITE_DISCLAIMER,
      heightModelSummary,
      `Modelo: ${HEIGHT_MODEL_ID} · versão ${HEIGHT_MODEL_VERSION} · atualizado em ${HEIGHT_MODEL_UPDATED_AT}.`,
      `Incerteza declarada do modelo: ± ${MODEL_UNCERTAINTY_CM} cm — margem estimada, não precisão garantida. Não há, nesta versão, recalibração estatística com amostra de campo pareada por segmento; onde a incerteza específica não existir, o sistema declara "não calibrada" em vez de afirmar acurácia.`,
    ],
  },

  {
    title: "Regra de decisão e encaminhamento a campo",
    items: [
      "Estimativa + incerteza abaixo do limite contratual: baixo risco, monitoramento remoto.",
      "Faixa de incerteza cruzando o limite: zona de validação — o ponto é encaminhado para confirmação presencial antes de concluir conformidade.",
      "Estimativa − incerteza acima do limite: alto risco, priorizar inspeção/intervenção.",
      "Limites contratuais variam por ativo e cláusula (30, 45 ou 60 cm). O status considera o limite específico do ativo, não apenas a regra geral de 30 cm.",
    ],
  },
  {
    title: "Limitações e natureza do sistema",
    items: [
      "Pontos conformes estimados por satélite NÃO equivalem a pontos medidos em campo.",
      "A plataforma é ferramenta de apoio à decisão e priorização; não substitui a medição contratual de campo.",
      POSITIONING_MESSAGE,
    ],
  },
];

/** Versão em linhas planas (usada no PDF). */
export const methodologyPlainLines = (): { title: string; lines: string[] }[] =>
  METHODOLOGY_SECTIONS.map(s => ({ title: s.title, lines: s.items.map(pdfSafe) }));

/** Fontes padrão do PDF não possuem alguns glifos Unicode; substitui por equivalentes ASCII. */
export const pdfSafe = (t: string) =>
  t.replace(/\u2212/g, "-").replace(/\u2192/g, "->").replace(/\u2264/g, "<=").replace(/\u2265/g, ">=");
