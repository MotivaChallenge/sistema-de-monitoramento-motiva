## Situação atual

Já concluídos nos últimos ciclos:
- `src/data/mock.ts` → `src/types/domain.ts` (imports migrados)
- `canonical` / `og:url` atualizados para `sistema-de-monitoramento-motiva.lovable.app`
- `Planejamento.tsx` padronizado em `sonner`

Este plano trata os itens **restantes** do QA, em ordem de impacto.

## Fase 1 — Acessibilidade e estados de erro (rápido, alto valor)

1. **`aria-label` em botões-ícone** nos componentes:
   - `Sidebar.tsx`, `TopHeader.tsx`, `MapPointSheet.tsx`, `Mapa.tsx` (toggles de camada, close, expand), `NotificationsPanel.tsx`, `AlertCard.tsx`.
2. **Estados de erro visuais** nas páginas que hoje só têm `Skeleton`:
   - `Alertas.tsx`, `Previsoes.tsx`, `ROI.tsx`, `Relatorio.tsx`, `Equipes.tsx`, `OrdensServico.tsx`.
   - Criar componente reutilizável `src/components/vegia/QueryErrorState.tsx` (mensagem + botão "Tentar novamente" chamando `refetch`).
3. **Remover `console.log`** residuais em código de produção (varredura com `rg "console\."`).

## Fase 2 — OSRM proxy com cache

4. Edge function `road-route`:
   - Recebe `{ code, waypoints }`.
   - Consulta cache em nova tabela `road_route_cache` (colunas: `code`, `waypoints_hash`, `line jsonb`, `source`, `updated_at`).
   - Miss → chama OSRM demo, grava, retorna. Hit → retorna direto.
5. Atualizar `useRoadRoute.ts` para chamar `supabase.functions.invoke("road-route", …)` em vez do fetch direto. Fallback (waypoints interpolados) mantido.
6. Migração SQL com `GRANT` + RLS (leitura pública/auth; escrita só service role).

## Fase 3 — Tipagem e consistência

7. Substituir `any` restantes por tipos concretos em:
   - `useVegiaData.ts` (mapeadores `mapSegment`, `mapCv`, `mapReport`…),
   - `Planejamento.tsx`, `Mapa.tsx`, `VisionAnalyzer.tsx`.
8. Padronizar demais toasts em `sonner` (auditar `@/hooks/use-toast` fora dos shims shadcn).

## Fase 4 — Landing e Configurações

9. `src/pages/Index.tsx`: rotular explicitamente KPIs demo (`Badge "Demonstração"`) OU trocar por agregações reais das tabelas (`segments`, `alerts`, `work_orders`). Preferência: rotular como demo — é landing institucional.
10. `Configuracoes.tsx`: remover toggle "Resumo diário por e-mail (Em breve)" até existir edge function de e-mail, para não prometer feature inexistente.

## Fase 5 — Testes mínimos

11. Adicionar em `src/test/`:
    - `auth.test.tsx` — render + fluxo básico (Testing Library, mocks do supabase).
    - `mapa.test.tsx` — render sem crash, presença de KPIs.
    - `ordens-servico.test.tsx` — criar OS (form submit mockado).
12. Sem cobertura E2E real (Playwright) nesta fase — apenas smoke tests unit/integration com Vitest.

## Fase 6 — Polimento (opcional)

13. `NotFound.tsx`: adicionar link "Voltar ao Mapa" e `console.warn` da rota inválida.
14. Gerar `sitemap.xml` no build via `scripts/generate-sitemap.ts` (rotas públicas: `/`, `/auth`).
15. `Integracoes.tsx`: mover roadmap estático para tabela `integrations_roadmap` (com RLS + GRANTs).

## Fora de escopo deste plano

- Importar shapefiles oficiais DER-SP/ANTT (depende de fonte de dados externa — abrir tarefa separada quando o usuário disponibilizar arquivos).
- Bulk export PDF em `Relatorio` (feature nova, não QA).
- Paginação server-side em `Equipes` / `OrdensServico` (não necessário no volume atual).

## Detalhes técnicos

- **Cache OSRM**: hash `sha256(JSON.stringify(waypoints))` truncado em 16 chars como chave; TTL não necessário (traçado de rodovia é estável).
- **QueryErrorState**: props `{ error: unknown, onRetry: () => void, message?: string }`, usa `AlertTriangle` do lucide + botão `outline`.
- **Migração `road_route_cache`**:
  ```sql
  CREATE TABLE public.road_route_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    waypoints_hash text NOT NULL,
    line jsonb NOT NULL,
    source text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(code, waypoints_hash)
  );
  GRANT SELECT ON public.road_route_cache TO authenticated, anon;
  GRANT ALL ON public.road_route_cache TO service_role;
  ALTER TABLE public.road_route_cache ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "public read" ON public.road_route_cache FOR SELECT USING (true);
  ```

## Sequência sugerida de execução

Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6. Fase 1 sozinha já entrega muito valor perceptível ao usuário.
