# Próximos passos — Governança + Central de Notificações

Plano curto e focado nas duas frentes que você pediu: terminar a governança em andamento e entregar uma nova funcionalidade operacional. Nenhuma funcionalidade existente será removida.

## Contexto atual

O build e os testes passam. O scan de segurança está limpo. A Fase 1 e parte da Fase 2 do plano anterior já foram implementadas:

- `cv_results` ganhou vínculo com `segments`, `rodovia`, coordenadas, fonte, modelo e revisão.
- `CVImageGrid` já filtra por escopo (trecho, rodovia, malha).
- `audit_log` e a função `private.has_role` foram criados.
- A busca por KM (`src/lib/km-search.ts`) já casa ponto contido no intervalo, não por substring.

O que ainda falta é ligar a `audit_log` às ações do dia a dia e expandir o feed de notificações, que hoje só reflete a tabela `alerts` e guarda o estado de "lido" apenas no `localStorage`.

---

## Fase 1 — Governança mínima viável

Objetivo: toda ação que altera dados sensíveis deixa rastro, e ações destrutivas pedem confirmação com contexto.

### Backend

1. **Cliente de auditoria** em `src/lib/audit.ts`:
   - Função `logAudit({ action, entity, entityId, before, after, reason })`.
   - Insere em `public.audit_log` usando o usuário da sessão atual.
   - Trata falhas silenciosamente (não quebra a operação principal), mas registra no console.

2. **Política de INSERT** já existe; garantir que os campos `user_id` e `user_email` sejam preenchidos pelo cliente de auditoria.

### Frontend

3. **Diálogo de confirmação padrão** em `src/components/vegia/ConfirmationDialog.tsx`:
   - Título, descrição do impacto, nome do registro afetado, botões "Cancelar" e "Confirmar".
   - Bloqueio de duplo clique e estado de loading no botão de confirmação.

4. **Integrar auditoria e confirmação** nas ações:
   - Concluir ordem de serviço (`OrdensServico.tsx`): confirmação + log.
   - Excluir ordem de serviço: confirmação + log.
   - Salvar configurações (`Configuracoes.tsx`): log das mudanças de pesos e limiares.
   - Alterar equipe (`Equipes.tsx`): log dos campos alterados.

5. **Correção técnica imediata**: resolver os warnings de `Function components cannot be given refs` causados pelo `react-helmet-async` em `App.tsx`/`Seo.tsx`.

### Critérios de pronto da Fase 1

- Concluir, excluir e editar OS/equipe/configuração exigem confirmação e geram linha no `audit_log`.
- Tela de Auth abre sem warnings de ref no console.
- Testes unitários para `src/lib/audit.ts`.

---

## Fase 2 — Central de Notificações (nova funcionalidade)

Objetivo: transformar o feed de alertas em uma central de notificações persistente, com filtros e múltiplas fontes.

### Backend

1. **Tabela `notification_reads`**:
   - `id uuid`, `user_id uuid`, `notification_id uuid`, `read_at timestamptz`.
   - GRANT para `authenticated` (INSERT/SELECT/DELETE próprio) e `service_role`.
   - RLS: usuário só lê/escreve seus próprios registros.

2. **Edge Function opcional** `enqueue-notification` (se necessário para notificações de OS):
   - Chamada após criação/conclusão de OS para inserir um alerta informativo.

### Frontend

3. **Página `/notificacoes`**:
   - Lista paginada com filtros: lida/não lida, severidade (crítico, atenção, info), rodovia, período.
   - Ações: marcar como lida, marcar todas como lidas, ir para o trecho/ordem relacionada.
   - Badges de severidade e indicador de não lida.

4. **Expandir fontes do feed**:
   - Além de `alerts`, incluir eventos de ordens de serviço (criada, atribuída, concluída).
   - Unificar a query em `useNotifications.ts`, substituindo `useAlertsFeed` no header.

5. **Header**:
   - Badge mostra contagem real de não lidas vindas do backend.
   - Painel popover reutiliza a mesma query, com atalho "Ver todas".

### Critérios de pronto da Fase 2

- Página `/notificacoes` acessível pela sidebar.
- Estado de lido persiste entre dispositivos (backend).
- Badge reflete notificações não lidas de `alerts` + `work_orders`.
- Filtros e paginação funcionam sem erros de console.

---

## Ordem de execução

1. Fase 1 primeiro (governança e correção de warnings).
2. Pausa para validação.
3. Fase 2 (central de notificações).
4. Pausa para validação.

## Riscos e mitigações

- **Risco**: políticas RLS de `audit_log` podem impedir leitura de não-admin.  
  **Mitigação**: manter a política atual (só admins leem; todos inserem). A página de auditoria, se solicitada depois, será restrita a admins.
- **Risco**: notificações de OS podem duplicar alertas existentes.  
  **Mitigação**: usar mensagens distintas (ex: "OS #123 criada para o trecho") e evitar inserir notificação quando já existe alerta ativo para o mesmo trecho.

## Não está no escopo deste plano

- Rebranding ou mudanças de layout macro.
- Novas integrações de API externa.
- Relatórios PDF/CSV avançados.
- Testes de carga ou pentest.
