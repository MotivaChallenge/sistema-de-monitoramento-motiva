
# Melhorias recomendadas — Vegia / Motiva Rodovias

Análise feita sobre o estado atual do código (Dashboard, Relatório, hooks, schema, Sidebar). Itens organizados por impacto. Você escolhe o que implementar.

---

## P0 — Quick wins (alto impacto, baixo esforço)

### 1. Página de Configurações real
Hoje o item "Configurações" no Sidebar só dispara `toast("Configurações em breve")`. Criar página `/configuracoes` com: perfil do usuário (display_name), preferências de UI (tema, densidade), parâmetros do IRC (pesos e limites editáveis), limiares de alerta (altura crítica). Persistência em tabela `user_settings` com RLS.

### 2. Empty states e skeletons consistentes
- Dashboard mostra "Carregando alertas…" como texto simples; resto do dashboard fica em branco.
- Relatório não trata caso `reports.length === 0`.
- Adicionar componentes `<Skeleton>` (já existe em ui/) para MetricCard, mapa, gráficos e tabela. Empty states amigáveis quando sem dados.

### 3. Tratamento de erro nas queries
Nenhum dos `useQuery` em `useVegiaData.ts` trata `isError`. Se a função weather ou Supabase falhar, a UI fica vazia sem feedback. Adicionar toast de erro + estado visual em cada seção.

### 4. Botão "Atualizar Dados" sem loading
`qc.invalidateQueries()` é assíncrono mas o botão dá toast de sucesso imediato. Mostrar spinner enquanto refetch está pendente e só notificar ao terminar.

### 5. Acessibilidade básica
- Sidebar: botão "Configurações" sem `aria-label`, e item Alertas/Relatórios apontam para a mesma rota `/relatorio` (o item Alertas fica visualmente quebrado).
- `<select>` no Relatório sem `<label>`.
- Botões com apenas ícone (kebab, refresh) sem `aria-label`.

---

## P1 — Funcionalidades faltantes que o produto promete

### 6. Exportação de PDF realmente funcional
Hoje "Exportar PDF" só dá toast. Implementar geração via edge function (puppeteer/jsPDF) ou client-side com `react-to-print` / `pdfmake`, contendo cabeçalho Motiva, tabela de medições, métricas de conformidade e assinatura técnica.

### 7. CRUD de segmentos / alertas para operadores
Schema tem `app_role: admin | operator | viewer` e `user_roles`, mas nenhuma UI usa. Operadores deveriam poder:
- Marcar alerta como resolvido
- Registrar nova roçada (atualiza `ultima_rocada` → recalcula IRC)
- Anotar observação no segmento

### 8. Histórico de roçadas
Hoje `ultima_rocada` é um único campo. Criar tabela `rocada_events (segment_id, data, responsavel, observacao)` para timeline real e cálculo correto de "dias desde a última roçada" no IRC.

### 9. Filtros globais persistentes
Os filtros do AIInsightsPanel (status/KM) já existem, mas não se aplicam ao mapa, à tabela de segmentos nem aos alertas. Mover filtros para o TopHeader e propagar via context/URL params.

### 10. Realtime nos alertas
Tabela `alerts` é perfeita para `supabase_realtime`. Hoje só atualiza no F5 ou no botão. Adicionar subscription para o badge de "Alertas ativos" piscar quando vier novo.

---

## P2 — Qualidade técnica

### 11. RLS e segurança
Rodar `supabase--linter` para verificar políticas. Confirmar que:
- `segments`, `alerts`, `inspection_*` têm RLS ativo
- Apenas `admin`/`operator` podem escrever
- `viewer` só lê
- `profiles` só dono lê/edita

### 12. Tipagem forte no `mapSegment`
`mapSegment(r: any)` perde a segurança de tipos do Supabase. Trocar por `Tables<"segments">` do `types.ts`.

### 13. Edge function `weather-rodoanel` — cache
Cada load do dashboard chama OpenWeather. Adicionar cache em memória (TTL 15 min) ou tabela `weather_cache` para reduzir custo/latência.

### 14. Code splitting
`Dashboard.tsx` importa Leaflet (OSMMap), Recharts, AIInsights — bundle pesado. Usar `React.lazy` para mapa e gráficos.

### 15. Testes
Existe `vitest.config.ts` mas só um `example.test.ts`. Adicionar testes para `lib/irc.ts` (fórmula crítica de negócio) e `useVegiaData` mocks.

---

## P3 — UX / Visual (Motiva)

### 16. Tema claro
A paleta Motiva inclui anil/branco. Hoje só existe o tema escuro. Criar variante clara para uso em apresentações/relatórios impressos.

### 17. Sidebar — duplicação
Itens "Alertas" e "Relatórios" apontam ambos para `/relatorio`. Criar página `/alertas` dedicada (lista filtrada de `alerts`) ou remover a duplicata.

### 18. Mobile real
Hoje só o header tem ajuste mobile. Sidebar fixa de 220px quebra em <900px. Implementar Sheet/Drawer para nav em mobile.

### 19. Breadcrumbs e navegação
TopHeader aceita breadcrumb mas só Relatório usa. Padronizar em todas as páginas internas (Segmento, AnaliseCV).

---

## Sugestão de ordem de execução

```text
Sprint 1 (P0):  1 Configurações  →  2 Skeletons  →  3 Erros  →  5 a11y
Sprint 2 (P1):  7 CRUD operador  →  10 Realtime alertas  →  9 Filtros globais
Sprint 3 (P1):  6 PDF real       →  8 Histórico de roçadas
Sprint 4 (P2):  11 RLS audit     →  13 Cache weather   →  14 Code split
```

---

## Próximo passo

Me diga quais itens entram no escopo (ex.: "faz 1, 2 e 7") e eu implemento. Se quiser, posso começar pelo **#1 Configurações**, que é o que você mencionou na mensagem anterior.
