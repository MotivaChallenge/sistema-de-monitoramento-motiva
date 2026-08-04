/** Dados mockados usados apenas onde não há origem no backend. */

/** Capacidade máxima de equipes da malha (não persistida no banco). */
export const TEAM_CAPACITY = 85;

export interface AiRecommendation {
  id: string;
  title: string;
  detail: string;
  tone: "critico" | "atencao" | "conforme";
}

export const AI_RECOMMENDATIONS: AiRecommendation[] = [
  {
    id: "ai-1",
    title: "Vegetação acima do limite recomendado",
    detail: "Agendar manutenção em até 3 dias para evitar não conformidade contratual.",
    tone: "critico",
  },
  {
    id: "ai-2",
    title: "Equipe ideal: Equipe Norte",
    detail: "Menor tempo de deslocamento e capacidade diária compatível com o trecho.",
    tone: "conforme",
  },
  {
    id: "ai-3",
    title: "Risco elevado devido à previsão de chuva",
    detail: "Acumulado previsto acelera o crescimento; antecipe a roçada dos trechos em atenção.",
    tone: "atencao",
  },
  {
    id: "ai-4",
    title: "Janela operacional favorável",
    detail: "Próximas 48h sem precipitação — priorize os trechos com IRC acima de 70.",
    tone: "conforme",
  },
  {
    id: "ai-5",
    title: "Reincidência detectada",
    detail: "Trechos com roçada há menos de 30 dias voltaram ao estado de atenção. Revise o ciclo.",
    tone: "atencao",
  },
];

/** Recomendações ordenadas conforme a criticidade do trecho ativo. */
export const recommendationsFor = (status?: "critico" | "atencao" | "conforme") => {
  if (!status) return AI_RECOMMENDATIONS;
  const rank = (r: AiRecommendation) => (r.tone === status ? 0 : 1);
  return [...AI_RECOMMENDATIONS].sort((a, b) => rank(a) - rank(b));
};