import type { Segment, Status } from "@/types/domain";
import { formatDateBR } from "@/lib/utils";
import { kmLabel } from "@/lib/km-format";

export interface OpsRecommendation {
  id: string;
  title: string;
  detail: string;
  tone: Status;
}

interface RecommendationInput {
  segments: Segment[];
  /** Score IRC por id de segmento. */
  ircById: Map<string, number>;
  rain5d: number;
  teamsAvailable: number;
  teamsTotal: number;
  pendingOrders: number;
}

const fmtKm = (s: Segment) => kmLabel(s.km);

/**
 * Recomendações operacionais derivadas dos dados reais da malha
 * (segmentos, IRC, clima e ordens de serviço) — sem conteúdo fixo.
 */
export const buildRecommendations = ({
  segments, ircById, rain5d, teamsAvailable, teamsTotal, pendingOrders,
}: RecommendationInput): OpsRecommendation[] => {
  const out: OpsRecommendation[] = [];
  if (!segments.length) return out;

  const criticos = segments.filter(s => s.status === "critico");
  const atencao = segments.filter(s => s.status === "atencao");
  const irc = (s: Segment) => ircById.get(s.id) ?? 0;
  const ordered = [...segments].sort((a, b) => irc(b) - irc(a));
  const top = ordered[0];

  if (criticos.length) {
    const worst = [...criticos].sort((a, b) => irc(b) - irc(a))[0];
    out.push({
      id: "rec-criticos",
      tone: "critico",
      title: `${criticos.length} trecho${criticos.length > 1 ? "s" : ""} em situação crítica`,
      detail: `Prioridade máxima em ${fmtKm(worst)} — altura ${worst.altura} cm contra limite de ${worst.limite} cm. Agende a roçada para evitar não conformidade contratual.`,
    });
  } else {
    out.push({
      id: "rec-conforme",
      tone: "conforme",
      title: "Nenhum trecho crítico no momento",
      detail: `Malha dentro dos limites contratuais. Aproveite a janela para roçada preventiva nos trechos de maior IRC, começando por ${fmtKm(top)}.`,
    });
  }

  if (top && irc(top) > 0) {
    out.push({
      id: "rec-irc",
      tone: irc(top) >= 75 ? "critico" : irc(top) >= 55 ? "atencao" : "conforme",
      title: `Maior IRC da malha: ${irc(top)}/100 em ${fmtKm(top)}`,
      detail: `${top.tipo} · NDVI ${top.ndvi.toFixed(2).replace(".", ",")} · última roçada em ${formatDateBR(top.ultimaRocada)}. Acima de 75 o risco de descumprimento é alto.`,
    });
  }

  if (rain5d >= 15) {
    out.push({
      id: "rec-chuva",
      tone: "atencao",
      title: `Chuva acumulada de ${rain5d.toFixed(0)} mm nos próximos 5 dias`,
      detail: `O volume previsto acelera o crescimento vegetativo e reduz a janela operacional. Antecipe os ${atencao.length} trecho(s) em atenção antes do período chuvoso.`,
    });
  } else {
    out.push({
      id: "rec-janela",
      tone: "conforme",
      title: "Janela operacional favorável",
      detail: `Apenas ${rain5d.toFixed(0)} mm de chuva previstos para os próximos 5 dias — boa oportunidade para executar as intervenções programadas.`,
    });
  }

  if (teamsTotal > 0) {
    const short = teamsAvailable === 0 || pendingOrders > teamsAvailable * 2;
    out.push({
      id: "rec-equipes",
      tone: short ? "atencao" : "conforme",
      title: short ? "Capacidade de equipes sob pressão" : "Capacidade de equipes adequada",
      detail: `${teamsAvailable} de ${teamsTotal} equipe(s) disponível(is) para ${pendingOrders} ordem(ns) em aberto.${short ? " Considere remanejar equipes ou reprogramar as ordens de menor prioridade." : ""}`,
    });
  }

  if (atencao.length) {
    out.push({
      id: "rec-atencao",
      tone: "atencao",
      title: `${atencao.length} trecho(s) em atenção`,
      detail: `Monitoramento reforçado recomendado — intervenção preventiva evita a migração para o estado crítico nos próximos ciclos.`,
    });
  }

  return out;
};