# Refatoração do Dashboard (Digital Twin)

## Análise do projeto atual

**Pontos fortes (reaproveitar)**
- Camada de dados madura: `useVegiaData.ts` com 16 hooks (segmentos, rodovias, equipes, ordens de serviço, NDVI, cobertura), React Query com cache e tratamento de erro global.
- Mapa já resolvido: `OSMMap.tsx` + `useRoadRoute.ts` (traçado real via OSRM com cache no backend) e `MapPointSheet.tsx`.
- Design system semântico em `index.css` (paleta anil + branco, sombras, transições) — atende ao pedido de "branco/cinza/azul escuro" sem retrabalho.
- Componentes reutilizáveis já existentes: `MetricCard`, `AlertCard`, `TopHeader`, `Sidebar` (retrátil), `QueryErrorState`.
- Login funcional, protegido, com reset de senha e branding correto.

**Pontos fracos**
- `Dashboard.tsx` (223 linhas) mistura layout, cálculo de KPI e formatação; cards financeiros escritos inline em vez de usar `MetricCard`.
- Não existe componente de Carousel próprio nem `StatisticCard`/`InfoBanner`.
- Falta pasta `mocks/`; tipagens `any` em alguns mapeamentos de dados.
- Dashboard atual não conversa com o mapa (seleção de trecho não reflete nos KPIs).

**Escopo confirmado**: apenas a tela de **Dashboard** será refatorada. Login e demais páginas permanecem como estão.

## Etapa 1 — Backup (antes de qualquer alteração)
Gerar um `.zip` do frontend atual (`src/`, `index.html`, configs de build e Tailwind) e disponibilizar para download como artefato. Nenhum arquivo do projeto é alterado nesta etapa.

## Etapa 2 — Nova estrutura do Dashboard

Layout em quatro faixas:

```text
┌───────────────────────────────────────────────┐
│ Carousel "Situação Geral" (auto, 5s)          │
├───────────┬───────────┬───────────────────────┤
│ Equipes   │Criticidade│ Local (trecho ativo)  │
│  42 / 85  │     5     │   432 km – 442 km     │
├───────────────────────────────────────────────┤
│ Mapa grande (largura total, ~520px)           │
├───────────────────────────────────────────────┤
│ Carousel "Recomendações da IA" (auto, 6s)     │
└───────────────────────────────────────────────┘
```

**Comportamento**
- Carousel superior: um slide por trecho relevante, cor da faixa por status (crítico vermelho / atenção âmbar / normal verde), troca automática, setas ilustrativas e indicadores de posição.
- Card Equipes: `disponíveis / total` vindo de `useFieldTeams`; clique navega para `/equipes`.
- Card Criticidade: nível do trecho selecionado (ou média da malha quando nada selecionado); clique navega para `/alertas`.
- Card Local: `km inicial – km final` do trecho selecionado, atualizado ao clicar no mapa, com animação suave de troca.
- Mapa: reaproveita `OSMMap`; 1º clique num ponto atualiza Criticidade + Local; 2º clique no mesmo ponto navega para `/segmento/:id` (página de detalhe já existente).
- Carousel de IA: recomendações mockadas conforme a criticidade do trecho ativo, troca automática.

**Dados (híbrido)**
- Reais: segmentos, rodovias, equipes, cobertura e status — hooks já existentes.
- Mockados em `src/mocks/`: recomendações de IA e capacidade máxima de equipes (85), quando não houver origem no banco.

## Etapa 3 — Organização do código
- Novos componentes em `src/components/dashboard/`: `Carousel.tsx`, `StatisticCard.tsx`, `InfoBanner.tsx`, `DashboardMap.tsx`.
- `src/hooks/useDashboardData.ts` concentra os cálculos de KPI hoje inline no `Dashboard.tsx`.
- `src/mocks/aiRecommendations.ts` e `src/mocks/dashboard.ts`.
- `Dashboard.tsx` fica apenas com a composição de layout (~80 linhas).
- Estado do trecho selecionado em contexto local do dashboard (evita prop drilling e permite reuso futuro).

## Estilo
Cantos levemente arredondados, bastante respiro, hover com elevação nos cards, transições de 200–300ms, tokens semânticos existentes (sem cores hardcoded), responsivo desktop/tablet (cards empilham em 1 coluna abaixo de 768px).

## Detalhes técnicos
- React + TypeScript, sem novas dependências: o Carousel usa o Embla já presente em `components/ui/carousel`.
- Nenhuma alteração de banco, RLS ou edge function.
- Páginas placeholder não são necessárias: `/equipes`, `/alertas` e `/segmento/:id` já existem e recebem a navegação.