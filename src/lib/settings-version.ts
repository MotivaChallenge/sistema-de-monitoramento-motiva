import type { UserSettings } from "@/hooks/useSettings";

/** Versão dos parâmetros de cálculo (pesos do IRC + limiares) — rastreável em relatórios. */
export const settingsVersionLabel = (s: UserSettings): string =>
  `IRC ${s.irc_weight_ndvi}/${s.irc_weight_altura}/${s.irc_weight_idade}/${s.irc_weight_chuva} · limiares ${s.altura_atencao_cm}/${s.altura_critica_cm} cm`;
