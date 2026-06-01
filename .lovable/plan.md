
# Substituir todos os mocks por dados reais

## 1. Novas tabelas (migration)

- **`segment_ndvi_history`** — histórico por segmento, alimenta gráfico de evolução e tendência.
  - Colunas: `segment_id text`, `data date`, `ndvi numeric`, `altura_cm integer`
  - RLS: SELECT autenticado, INSERT/UPDATE/DELETE admin
- **`field_teams`** — equipes designadas por trecho (substitui "Consórcio SP-Verde" hardcoded).
  - Colunas: `id`, `nome text`, `base_km numeric`, `tempo_resposta_min integer`
- **`segment_team_assignment`** — `segment_id` → `team_id`.

## 2. Seed inicial

- Popular `segment_ndvi_history` com ~7 leituras por segmento existente (curva derivada do NDVI/altura atual + variação histórica) para o gráfico não ficar vazio.
- Popular `field_teams` com 2-3 equipes e atribuir aos segmentos atuais.

## 3. Hooks novos (`useVegiaData.ts`)

- `useSegmentNdviHistory(segmentId)` → últimas 7 leituras do segmento.
- `useNdviTrend()` → média global das últimas 6 leituras (substitui `ndviTrend` mock).
- `useNdviHeatmap()` → faixas km×status derivadas de `segments` (sem mock).
- `useSegmentTeam(segmentId)` → equipe designada (nome, base, tempo).
- `useTotalCoverage()` → soma `kmEnd - kmStart` (substitui "29,3 km" fixo).

## 4. Componentes a atualizar

- `Segmento.tsx`
  - Gráfico de evolução: usa `useSegmentNdviHistory` em vez de `segmentEvolution`.
  - "Equipe Designada": usa `useSegmentTeam`.
  - "48h para Resolução": calculado a partir de `seg.deadline` (já existe no banco).
- `NDVIBarChart.tsx` → consome `useNdviTrend()`.
- `NDVIHeatmapBar.tsx` → consome `useNdviHeatmap()`.
- `Dashboard.tsx` → "Cobertura Total" calculada de `useTotalCoverage()`.
- `AnaliseCV.tsx` → remover fallback para `cvImages` mock (mostrar empty state se `cv_results` vazio).

## 5. Cleanup

- Remover de `src/data/mock.ts`: `segments`, `segmentEvolution`, `ndviTrend`, `ndviHeatmap`, `cvImages`.
- Manter apenas `Status` type e `Segment` interface (são contratos de tipo, não dados).
- Atualizar imports.

## 6. Verificação

- Build automático.
- Conferir Dashboard, Segmento (vários KMs), AnaliseCV.

---

**Resultado:** zero dados hardcoded fora de tipos TypeScript. Todos os gráficos e métricas vêm do Lovable Cloud.
