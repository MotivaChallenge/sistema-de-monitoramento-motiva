
# Fechamento das pendências ORION

Após auditoria dos arquivos, restam três frentes para o sistema ficar 100% conectado ao Lovable Cloud (sem quebrar o que já funciona).

## 1. Planejamento Operacional conectado ao DB

Hoje `src/pages/Planejamento.tsx` usa um array `TEAMS` hardcoded. Já existe a tabela `field_teams` no banco.

- Substituir `TEAMS` por `useFieldTeams()`.
- Considerar `capacidade_dia` e `regiao` reais das equipes cadastradas.
- Ignorar equipes com status `manutencao`/`afastada` na distribuição.
- Loading state (Skeleton) enquanto equipes carregam.

## 2. Persistir plano gerado (opcional dentro desta rodada)

Salvar o plano gerado como ordens de serviço em `work_orders`:

- Botão "Gerar ordens de serviço" no topo da página.
- Cria uma OS por trecho planejado com `team_id`, `segment_id`, `scheduled_for` (data calculada a partir do "dia") e `priority` derivada do IRC.
- Usa `useMutation` + invalidação de `work_orders`.

## 3. Alertas persistentes

`useAlertsFeed` hoje é apenas in-memory (toasts). A tabela `alerts` já existe e é usada no dashboard.

- Novo hook `useCreateAlert` para gravar alertas de novos trechos críticos.
- Página `/alertas` já lê de `useAlerts` — validar que continua funcionando com os alertas gravados aqui.
- Não mudar comportamento visual dos toasts; só espelhar no DB.

## 4. Limpeza final dos mocks residuais

- `src/data/mock.ts`: verificar se ainda exporta dados usados. Remover exports não-tipo.
- `src/pages/Dashboard.tsx`: remover comentário "mock parametrizado" — o cálculo já é derivado de segments reais, só ajustar wording.
- `src/pages/Previsoes.tsx`: manter (é modelo determinístico legítimo baseado em segments + clima reais), mas trocar o comentário `mock determinístico` por `heurístico determinístico` para não induzir erro na leitura do código.

## Fora do escopo desta rodada

- `ROI.tsx`: é uma calculadora paramétrica (usuário ajusta km/custo/redução). Continua como está.
- `AnaliseCV.tsx` já lê `cv_results` do DB.
- Substituir Groq/regras por ML real (mencionado no audit) — depende de infra externa.

## Ordem de execução

1. Trocar `TEAMS` por hook em `Planejamento.tsx`.
2. Adicionar geração de OS a partir do plano.
3. Espelhar alertas críticos em `alerts` via `useCreateAlert`.
4. Limpar comentários enganosos e checar `data/mock.ts`.
5. Build automático valida a integração.

## Detalhes técnicos

- Nenhuma migração nova é necessária: `field_teams`, `work_orders` e `alerts` já existem com as colunas requeridas.
- Priority mapping: IRC ≥ 75 → `critica`, ≥ 55 → `alta`, ≥ 35 → `media`, senão `baixa`.
- `scheduled_for`: `hoje + dia (índice)` em ISO date.
- Round-robin de equipes continua igual, só que iterando sobre `data ?? []` do hook.
