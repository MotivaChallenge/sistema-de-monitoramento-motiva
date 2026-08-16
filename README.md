# Challenge Motiva

Build a React SPA called VegiaMap — a vegetation compliance monitoring dashboard for a Brazilian highway concessionaire (Motiva/Rodoanel SP-021). Convert the attached HTML screens into a fully navigable React app with React Router.

**Design system (must match exactly):**

- Colors: primary #00694C, background #FCF9F1, surface-low #F6F4EB, surface-high #EAE8E0, error #BA1A1A, tertiary #854F0B, secondary-container #B7F473

- Font: Inter. Monospace (10px) for contract clauses

- No box borders for sectioning — use background color shifts only

- No drop shadows — elevation through tonal contrast

**4 pages with React Router:**

1. `/dashboard` — Fixed sidebar (220px) + top header with "3 CRÍTICOS / 7 ATENÇÃO" badges + 4 KPI metric cards (Cobertura 29.3km, Trechos Críticos, NDVI Médio 0.54, Conformidade ARTESP 84%) + linear NDVI heatmap of the Rodoanel (colored segments: green/amber/red) with KM markers (0, 5, 10, 15, 20, 25, 29.3) + right panel with alert list (each alert has: KM, status badge, NDVI value, estimated height, monospace ARTESP clause) + bar chart of last 6 NDVI readings. Clicking any alert navigates to `/segmento/:id`.

2. `/segmento/:id` — "Detalhamento de Segmento". Left column: data table (NDVI, altura estimada in red if >30cm, limite contratual 30cm, última roçada date, deadline ARTESP in red, normative clause in a gray monospace box). Line chart of 30-day NDVI evolution with red dashed threshold line at 30cm. AI insight bubble (green background). Right column: Street View photo card + CV detection result card (class + confidence %) + action buttons: "Gerar OS de roçada" (primary red), "Exportar", "Resolvido". Top right: critical state badge "48h para Resolução".

3. `/relatorio` — "Relatório de Conformidade". 4 KPI cards + sortable/filterable table with columns: Segmento (KM), Tipo, NDVI (mini colored bar), Altura, Status (dot + text), Cláusula (monospace pill), Deadline (red if urgent). "Exportar PDF" button top right. Footer: "R$ 84.000 em multas evitadas (estimado)" highlighted card.

4. `/analise-cv/:id` — "Análise Visual". 2×3 image grid with bounding box overlays (colored rectangles with label + confidence %), KM badge on each image. "Diagnóstico AI Consolidado" section at bottom with operational recommendations list.

**State:** Use mock JSON data for all segments, alerts, and CV results. `useState` for active filters and selected segment. No real API calls needed.

**Components to create:** `Sidebar`, `TopHeader`, `MetricCard`, `AlertCard`, `NDVIHeatmapBar`, `NDVILineChart`, `SegmentTable`, `CVImageGrid`, `AIInsightBubble`, `ComplianceBadge`, `MonoClause`.

Make all navigation functional. "Gerar OS" button shows a success toast. The sidebar highlights the active route.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sistema-de-monitoramento-motiva.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/070ca8a9-9f49-4040-a84b-3259ebce1a4a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
