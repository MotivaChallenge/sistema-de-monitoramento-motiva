# Revisão de confiabilidade, rastreabilidade e governança

Escopo amplo, entregue em fases. Nada é removido; dados existentes não são sobrescritos sem confirmação. Onde não houver dado real, a interface passa a exibir "Sem dados" / "Aguardando medição".

## O que foi verificado no código atual

- **Análise Visual** (`CVImageGrid`) lê a tabela `cv_results` inteira, sem filtro por segmento — por isso a tela de um trecho mostra KM de outros. A tabela só tem `km` como texto, sem vínculo com segmento, rodovia, coordenada, fonte da imagem, modelo ou revisão humana.
- **Conformidade** usa a fórmula ponderada `(nível1 + nível2×0,5) / pontos avaliados`, mas a tela mostra só o percentual e, ao lado, a contagem de 471 segmentos — dois universos diferentes sem rótulo.
- **Busca** (`FiltersContext.matches`) é um `includes` de texto simples: `3+000` casa com `13+000` e `23+000`.
- **Notificações**: o feed é limitado a 20 itens e o badge mostra "9+" para não lidos, enquanto o dashboard conta 188 alertas ativos — números corretos, rótulos ambíguos.
- Não existe tabela de auditoria nem confirmação nas ações destrutivas; papéis hoje são apenas admin / operator / viewer.

## Fase 1 — Confiabilidade dos dados (Prioridade 0)

**Análise Visual**
- Migração: adicionar em `cv_results` os campos `segment_id`, `rodovia`, `km_start/km_end`, `lat/lng`, `captured_at`, `source` (drone/satélite/câmera/upload), `model`, `model_version`, `threshold`, `review_status`, `alert_id`, `work_order_id`, `image_id`. Backfill apenas derivando `segment_id` do KM já existente; nada é apagado.
- Tela dividida em abas rotuladas: "Detecções deste trecho", "Resumo da rodovia", "Resumo da malha". Cada card exibe a ficha completa de metadados; campos sem valor mostram "Não informado".

**Conformidade**
- Novo bloco de KPI com fórmula visível: numerador, denominador, unidade, escopo e data. Separação explícita entre pontos de medição avaliados e segmentos monitorados, com nota de relação entre os dois universos.

**Busca por KM**
- Utilitário de normalização (`3`, `3+000`, `KM 3`, `BR-448 KM 3`) reaproveitando `src/lib/km.ts`, com correspondência por ponto contido no intervalo, por rodovia, tipo, ID de segmento e código de OS. A interface indica a regra aplicada e quantos resultados por regra.

## Fase 2 — Segurança e governança (Prioridade 1)

- Tabela `audit_log` (usuário, ação, entidade, id, valor anterior, valor novo, motivo, data/hora, origem) e gravação em toda alteração de OS, equipe, pesos do IRC, limiares, alerta, relatório, detecção e perfil.
- Ampliação do enum de papéis para administrador, gestor operacional, analista, operador de campo e visualizador, com políticas de acesso por papel.
- Diálogo de confirmação padronizado para Excluir, Concluir ordem, Salvar alterações e Gerar ordens, com impacto descrito, registro afetado, bloqueio de duplo clique e desfazer quando possível.
- "Gerar ordens de serviço" passa a abrir uma prévia (ordens previstas, duplicidades, conflitos de agenda, trechos sem equipe, equipes acima da capacidade, prazos inviáveis) e só grava após confirmação.

## Fase 3 — Dashboard e notificações (Prioridade 2)

- Dashboard reordenado por decisão: alertas críticos, trechos prioritários, evidências, ordens abertas/atrasadas, equipes, previsão, tendência.
- Todo KPI clicável abrindo lista filtrada, com escopo, período, unidade, fonte, data de atualização e tooltip.
- Central de notificações completa (lidas/não lidas, severidade, origem, trecho, rodovia, OS, responsável, filtros, marcar como lida). Badge passa a ser rotulado como "não lidas" com legenda do total.

## Fase 4 — Ordens de serviço (Prioridade 3)

- Correção de "rocada" para "roçada" na interface, datas em `dd/mm/aaaa` com date picker pt-BR.
- Formulário com campos obrigatórios sinalizados e validações (código único, trecho válido, equipe compatível, prazo futuro, duplicidade, conflito de agenda, capacidade) e novos campos: alerta de origem, cláusula, coordenadas, duração estimada, SLA, evidência prévia, risco, material.
- Linha do tempo do ciclo de vida (criada → atribuída → aceita → iniciada → pausada → concluída → validada → reaberta), conclusão com observação/evidência/data/local e status "Atrasada" com filtro próprio.

## Fase 5 — Planejamento, equipes e previsões (Prioridades 4 e 5)

- Separação de `trechos/dia` e `km/dia`; cartões de equipe com capacidade planejada, utilizada, restante e carga real calculada.
- Cadastro de equipe ampliado (habilidades, veículos, equipamentos, base, jornada, afastamento, produtividade, SLA) e ranking com período, fórmula e denominador explícitos.
- Previsões com intervalo de confiança, versão do modelo, período dos dados, erro histórico e aviso de saturação quando todos os trechos forem previstos como críticos.

## Fase 6 — Padronização, exportações e acessibilidade (Prioridades 6 e 7)

- Nomenclatura única (roçada, Conforme, `KM 3+000`, cm/m), origem do valor em cada dado (campo, satélite, modelo, operador, cálculo) e rótulo "MEDIDO EM CAMPO" onde aplicável.
- CSV/PDF com filtros aplicados, metadados, fórmulas, responsável, UTF-8 com acentos e todos os registros.
- Acessibilidade: labels, headings, landmarks, `aria-pressed`, `aria-current`, foco visível, tabelas semânticas, contraste; testes em 320/768/1024/desktop e correção do carregamento inicial da tela de login com fallback de erro.

## Detalhes técnicos

- Migrações aditivas (colunas novas com valor nulo permitido e backfill derivado), com GRANT e políticas por papel; nenhum `UPDATE` em dado real sem confirmação prévia.
- Novos utilitários: normalização/parse de KM, formatação de KPI com fórmula, cliente de auditoria.
- A cada fase entrego arquivos alterados, tabelas afetadas, riscos, testes executados e pendências.

## Ordem de execução

Começo pela Fase 1 e sigo em sequência, pausando ao fim de cada fase para você validar antes da próxima.
