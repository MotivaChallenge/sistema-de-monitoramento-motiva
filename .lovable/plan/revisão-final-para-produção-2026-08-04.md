# Revisão final para produção

Objetivo: deixar o sistema utilizável de ponta a ponta, sem telas incompletas, botões sem ação, warnings de console ou elementos apenas ilustrativos.

## Fase 1 — Auditoria guiada por navegação real

Percorrer com navegador automatizado, autenticado, todas as rotas (`/auth`, `/dashboard`, `/mapa`, `/previsoes`, `/planejamento`, `/equipes`, `/ordens`, `/segmento/:id`, `/relatorio`, `/alertas`, `/analise-cv/:id`, `/configuracoes`, `/reset-password`, rota inexistente) em desktop (1280) e mobile (390), registrando: erros de console, requisições falhas, botões sem efeito, estados de carregamento/vazio ausentes e quebras de layout. O resultado dessa varredura define a lista final de correções — os itens abaixo são os problemas já confirmados na leitura do código.

## Fase 2 — Correções já confirmadas

1. **Warning de console em /previsoes**: o `CartesianGrid` do recharts 2.15.4 dispara "Function components cannot be given refs" nos gráficos da página. Ajustar a composição dos gráficos para eliminar o warning.
2. **Assistente de IA meramente ilustrativo**: `AIChatWidget` responde com texto fixo por palavra-chave. Conectar à edge function `ai-insights` já existente, enviando o contexto atual da malha, com estado de digitação real, tratamento de erro e fallback offline.
3. **Recomendações de IA mockadas**: `src/mocks/dashboard.ts` (`AI_RECOMMENDATIONS`, `recommendationsFor`) alimenta o carrossel do dashboard. Substituir por recomendações derivadas dos dados reais (segmentos críticos, IRC, chuva prevista, ordens pendentes) e remover o arquivo de mocks; `TEAM_CAPACITY` passa a ser o somatório real de `capacidade_dia` das equipes.
4. **Rótulos fictícios**: textos como "Modelo v2.4 · Atualizado há 2h" em /previsoes passam a refletir data/hora real do último dado carregado.

## Fase 3 — Correções resultantes da auditoria

Para cada problema encontrado na Fase 1, aplicar a correção na categoria correspondente:

- **Ações e navegação**: todo botão com ação real ou removido; links internos válidos; navegação de volta consistente.
- **Formulários**: validação com mensagens claras em Configurações, Ordens de Serviço, Equipes e Auth; botões desabilitados durante envio; feedback de sucesso/erro via toast.
- **Estados**: skeleton em todo carregamento, empty state com texto e ação em toda lista vazia, `QueryErrorState` com "tentar novamente" em toda consulta que pode falhar.
- **Responsividade**: tabelas com rolagem horizontal, grids que colapsam, mapa e overlays utilizáveis em telas pequenas.
- **Acessibilidade**: `aria-label` em botões só com ícone, foco visível, alvos de toque de 44px, um único `<main>` por página, hierarquia de títulos correta.
- **Segurança básica**: confirmar que toda ação de escrita respeita o papel do usuário (`canEdit`) na interface, além das políticas do banco.

## Fase 4 — Validação

Reexecutar a navegação completa da Fase 1 após as correções e confirmar: zero erros e warnings de console, zero requisições com falha, todos os fluxos concluídos (login → navegação → filtros → mapa → detalhe do segmento → geração de OS → relatório → logout). Rodar a suíte de testes existente e o lint. Só considerar concluído com o relato dessa segunda passagem limpo.

## Notas técnicas

- Sem alteração de esquema do banco prevista; ajustes de política só se a auditoria revelar uma escrita bloqueada indevidamente.
- Nenhum novo pacote previsto além de validação de formulário, caso ainda não esteja em uso.
- Correções feitas em lotes por página, com verificação por navegador entre os lotes.