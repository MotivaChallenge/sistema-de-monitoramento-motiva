# Melhoria do Design System da Plataforma

## Objetivo
Atualizar a linguagem visual da plataforma sem quebrar funcionalidades, dados, rotas ou fluxos existentes.

A direção escolhida será **Anil modular bento**: manter a paleta atual da Motiva, adotar tipografia mais compacta e organizar as telas em grade modular para reduzir poluição visual e destacar decisões operacionais.

## Decisões visuais aprovadas

- **Paleta:** continuar com a paleta atual em anil, com ajustes apenas em tokens, contraste e consistência.
- **Tipografia:** títulos com Space Grotesk e textos de interface com DM Sans.
- **Estrutura:** grade modular tipo bento, com blocos mais claros por prioridade operacional.
- **Estilo:** institucional, compacto e preciso; sem visual futurista/decorativo.
- **Raio dos elementos:** reduzir para no máximo 8px, preservando aparência profissional.

## O que será melhorado

1. **Tokens globais**
   - Revisar cores semânticas, superfícies, bordas, sombras, raios, tipografia e transições.
   - Preservar temas claro/escuro e modo compacto.

2. **Navegação e cabeçalho**
   - Refinar menu lateral retrátil, estados ativos, badges e área do usuário.
   - Deixar o topo mais limpo, com controles consistentes e melhor leitura em telas menores.

3. **Blocos principais do dashboard**
   - Aplicar a composição bento ao painel principal.
   - Destacar origem dos dados, zona de decisão, clima, indicadores e prioridades sem aumentar conteúdo.
   - Melhorar hierarquia visual para risco, atenção, normalidade e ação recomendada.

4. **Componentes compartilhados**
   - Harmonizar cartões, botões, filtros, avisos, badges, tabelas, formulários, painéis e estados vazios.
   - Substituir estilos inconsistentes por padrões reutilizáveis do design system.

5. **Acessibilidade e UX**
   - Reforçar contraste, foco por teclado, tamanhos tocáveis, legibilidade e estados de carregamento.
   - Conferir mobile, tablet e desktop para evitar quebras, sobreposição ou rolagem lateral indevida.

## O que não será alterado

- Nenhuma regra de cálculo, calibração, contrato, incerteza ou decisão operacional.
- Nenhuma integração, consulta, autenticação, permissão ou estrutura de dados.
- Nenhum texto técnico será inventado ou alterado além de ajustes visuais necessários.
- Nenhuma landing page será criada.

## Validação

- Conferir visualmente as rotas principais: Dashboard, Mapa, Relatórios, Previsões, Planejamento, Equipes, Ordens, Notificações, Segmento, Dataset e Configurações.
- Validar tema claro, tema escuro e densidade compacta.
- Rodar typecheck, testes automatizados e verificar o build da prévia.
- Corrigir qualquer erro ou regressão encontrada antes de concluir.

## Detalhes técnicos

- Atualizar `src/index.css` e `tailwind.config.ts` com tokens semânticos consistentes.
- Ajustar componentes compartilhados antes das páginas, para evitar retrabalho.
- Aplicar a direção visual escolhida primeiro no Dashboard e depois propagar os padrões às demais telas.
- Evitar cores hardcoded nos componentes; usar tokens semânticos.
- Manter componentes e hooks existentes sempre que possível.
