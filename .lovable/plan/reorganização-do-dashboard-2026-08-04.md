# Reorganização do Dashboard

Objetivo: hierarquia visual clara, menos poluição, foco em decisão operacional. Sem mapa (mantido em /mapa).

## Nova ordem da página

1. **Faixa de status rápido** (topo, compacta): carousel de Situação Geral (mantido) + linha fina com "Última atualização dos dados" e "% da malha monitorada".
2. **Clima da rodovia em destaque**: o card de clima sobe para logo abaixo do carousel, em card largo, com os próximos dias e a chuva acumulada (impacto operacional) em evidência.
3. **KPIs principais** (4 cards): Cobertura, Trechos Críticos, NDVI Médio, IRC Médio — o IRC agora só como número + barra (indicador rápido).
4. **Painel operacional do dia** (3 colunas):
   - Prioridades: top 5 trechos por IRC, clicáveis para o detalhe do segmento.
   - Próximas manutenções: ordens de serviço programadas, com data e trecho.
   - Equipes: disponíveis / em operação, com link para a página de Equipes.
5. **Coluna secundária**: Alertas Ativos (mantido, à direita) + NDVI em versão compacta.
6. **Recomendações da IA**: carousel inferior mantido, porém enxuto.

## Componentes redimensionados

- **IRC**: deixa de ser uma seção grande; vira indicador compacto na linha de KPIs (valor, faixa de risco e barra). O detalhamento continua acessível na página do segmento.
- **NDVI**: gráfico com altura reduzida (~180px), sem legenda extensa, dentro de um card menor na coluna lateral.
- **Insights da IA**: removido do fluxo da página.

## Assistente de IA flutuante

- Botão circular fixo no canto inferior direito, acima do conteúdo, respeitando a área segura no mobile.
- Clique abre uma janela compacta (~360x480px, ancorada ao botão) com cabeçalho, histórico de mensagens e campo de envio.
- Respostas mockadas por enquanto (respostas curtas contextuais com base em status/críticos), com indicador de "digitando".
- Fecha por botão X, tecla Esc e clique fora; foco no campo de texto ao abrir.
- Renderizado sobre o dashboard, sem empurrar o conteúdo.

## Detalhes técnicos

- `src/pages/Dashboard.tsx`: reescrita do layout; remove `AIInsightsPanel` e a seção grande do `IRCPanel`.
- Novos componentes em `src/components/dashboard/`: `PriorityList.tsx`, `UpcomingMaintenance.tsx`, `TeamsStatus.tsx`, `OpsSummaryBar.tsx`.
- Novo `src/components/vegia/AIChatWidget.tsx`; `AIInsightsPanel.tsx` permanece no repositório para reaproveitamento futuro dentro do chat.
- Dados já disponíveis via `useWorkOrders`, `useFieldTeams`, `useTotalCoverage`, `useDashboardData` e `ircForSegment`. Nenhuma mudança de banco.
- Apenas tokens semânticos, sem cores hardcoded. Grid responsivo (1 coluna no mobile, 2 no tablet, 3–4 no desktop).