# Evolução do projeto — Roadmap

Resumo das principais fases do VegiaMap, do protótipo inicial até a versão atual. As fases marcadas com **✓** já foram entregues.

---

## Fase 0 — Protótipo com dados fictícios ✓

**Objetivo**: validar a proposta de interface e o fluxo de navegação.

- Telas estáticas convertidas em React SPA.
- Dados mockados para segmentos, alertas, ordens e resultados de visão computacional.
- 4 páginas iniciais: `/dashboard`, `/segmento/:id`, `/relatorio`, `/analise-cv/:id`.
- Navegação funcional, sidebar fixa, badges de status.

**O que mudou**: os dados fictícios foram substituídos por integrações reais nas fases seguintes.

---

## Fase 1 — Banco de dados real ✓

**Objetivo**: dar fundo de verdade às telas.

- Integração com Supabase/Lovable Cloud.
- Tabelas: `segments`, `segment_ndvi_history`, `rocada_events`, `field_teams`, `work_orders`, `alerts`, `notifications`.
- Hooks de dados (`useVegiaData.ts`, `useDashboardData.ts`).
- Autenticação e rotas protegidas.

---

## Fase 2 — Integrações externas ✓

**Objetivo**: trazer dados reais de satélite, clima e rota.

- Edge Functions:
  - `gee-ndvi` e `gee-refresh-segments` — Sentinel-2 via Google Earth Engine.
  - `open-meteo-forecast` e `weather-rodoanel` — previsão do tempo.
  - `road-route` — rota real da via via OSRM.
  - `vision-detect` — detecção visual.
  - `ai-insights` e `point-insight` — assistente de IA.
- Cálculo de NDVI, EVI e SAVI por trecho.

---

## Fase 3 — Mapa operacional com traçado real ✓

**Objetivo**: mostrar a rodovia no mapa e cada trecho no quilômetro certo.

- Integração com Leaflet (`OSMMap.tsx`).
- Traçado real do Rodoanel via OSRM/road-route cache.
- Marcadores por quilômetro com altura estimada e origem do dado.
- Painel lateral ao clicar em um ponto (`MapPointSheet.tsx`).

---

## Fase 4 — Planejamento e priorização ✓

**Objetivo**: transformar dados em ordem de serviço.

- Criação do **Índice de Risco de Crescimento (IRC)**.
- Tela de planejamento (`/planejamento`) com alocação sugerida de equipes.
- Tela de equipes (`/equipes`) e ordens de serviço (`/ordens`).
- Previsões (`/previsoes`) para cenários de crescimento.

---

## Fase 5 — Governança e transparência ✓

**Objetivo**: a banca conseguir confiar no que está vendo.

- Rótulos de origem do dado (`campo`, `satelite`, `cv`, `demo`).
- `DataSourcePanel.tsx` mostrando fonte, período, qualidade e última atualização.
- `DecisionZone.tsx` com regra de decisão baseada em incerteza.
- Modo demonstração claramente sinalizado.
- Auditoria (`audit_log`) e histórico de ações.

---

## Fase 6 — Métrica composta de vegetação ✓

**Objetivo**: encontrar o melhor índice para estimar altura.

- Descoberta: NDVI, EVI e SAVI são quase redundantes no trecho (correlação > 0,99).
- SRVI é uma transformação exata do NDVI, portanto não acrescenta informação nova.
- Criação do índice composto `V = 0,10·NDVI + 0,55·EVI + 0,35·SAVI`, justificado pelo ruído temporal e não por tentativa e erro.

---

## Fase 7 — Estimativa de altura e calibração ✓

**Objetivo**: converter índice em centímetros de forma honesta.

- Dois pontos de calibração de campo (rotatória e sítio).
- Reta calibrada: `H = 163,4·V − 28,2`.
- Painel `CompositeHeightPanel.tsx` explicando o cálculo passo a passo.
- Formulário de medição de campo (`FieldMeasurementForm.tsx`) com data da imagem e tipo de local.

---

## Fase 8 — Redução do erro de ±13 cm para ±2,9 cm ✓

**Objetivo**: melhorar a precisão sem inventar dados.

- Testadas e descartadas: curva de Gompertz, termo temporal de roçada, modelo Beer-Lambert, troca de pesos entre índices.
- Solução adotada: composição temporal de várias imagens + uso da média de várias réguas por trecho.
- Resultado: MAE 1,0 cm, pior caso 2,9 cm na média do trecho.
- O erro de ±13 cm foi mantido apenas como fallback para trechos sem EVI/SAVI.

---

## Fase 9 — Design system, acessibilidade e mobile ✓

**Objetivo**: deixar a plataforma visualmente consistente e usável em qualquer tela.

- Design system "Anil modular bento": cores anil, superfícies claras, fontes Space Grotesk + DM Sans.
- Sidebar retrátil, tema claro/escuro.
- Ajustes de contraste, rótulos honestos, foco em acessibilidade.
- Testes de Playwright para garantir que não há rolagem lateral no mobile.

---

## Fase 10 — QA e testes automatizados ✓

**Objetivo**: garantir que a plataforma não quebra e os números estão corretos.

- 100+ testes com Vitest cobrindo modelos, decisão, IRC, calibração, índices espectrais e formatação.
- Navegação automatizada com Playwright verificando 14 rotas, redirecionamentos e exportações.
- Build e typecheck passando.

---

## Próximos passos

1. **Expansão da calibração**: 8 a 10 locais, 5 réguas cada, imagem Sentinel a até 3 dias da medição.
2. **Vinculação de datas de imagem**: mostrar a data exata da cena Sentinel usada em cada leitura.
3. **Modelo por ambiente**: avaliar se rotatórias, canteiros e áreas rurais precisam de retas distintas.
4. **Automação de atualização**: agendamento periódico das Edge Functions de GEE.
5. **Relatórios regulatórios**: templates prontos para envio à ARTESP.

---

*Última atualização: 18/09/2026.*
