# Matemática precisa com dados reais do Sentinel-2 (Rodoanel SP-021)

## Situação atual (verificada)

- O NDVI e a altura dos 40 trechos do Rodoanel estão gravados no banco como valores de carga inicial; o Sentinel-2 real só é consultado quando alguém abre o detalhe de um ponto (função `gee-ndvi`), e o resultado não é salvo.
- A altura usa a fórmula fixa `altura = (NDVI − 0,15) × 90`, duplicada em dois lugares (front e função). A incerteza de ±13 cm é uma constante única para todos os trechos.
- A tela Protótipo compara o modelo com a própria altura gravada (que não é medição de campo), gerando MAE/RMSE que não representam erro real.
- No banco, a diferença entre a altura gravada e a fórmula tem desvio de até 24 cm no SP-021 — ou seja, os números hoje não são coerentes entre si.
- O IRC usa `Date.now()` e arredondamentos que podem variar entre telas; o NDVI normalizado ignora saturação acima de 0,8.

## O que será feito

### 1. Leituras reais do satélite, salvas no banco
- Nova tabela `segment_satellite_readings` (somente acréscimo, nunca apaga): por trecho, guarda NDVI/EVI/SAVI (mediana, média, desvio-padrão, mín, máx), pixels válidos, nº de cenas, período, buffer, versão do modelo e data da leitura.
- Nova função `gee-refresh-segments`: percorre os 40 trechos do SP-021 usando as coordenadas já gravadas, consulta o Earth Engine ao longo do trecho (buffer de 30 m sobre a linha entre os marcos de KM, em vez de um círculo de 150 m no ponto — mede a faixa de domínio, não a pista/asfalto), salva a leitura e **substitui** `ndvi` e `altura` do trecho. O valor anterior fica registrado na tabela de leituras com origem "carga inicial" e na auditoria.
- Botão "Atualizar dados do satélite" no Dashboard e no Mapa (só para o SP-021), com progresso e resumo (trechos atualizados, sem imagem válida, erros).
- Agendamento semanal automático (segunda-feira 03:00) via cron do backend, com trava para não rodar duas vezes ao mesmo tempo.
- Trechos sem pixels válidos suficientes (< 20) ou sem cena no período não são sobrescritos — mantêm o último valor e recebem o aviso "sem leitura válida no período".

### 2. Matemática da altura e da incerteza, corrigida
- Fórmula única compartilhada (front + funções), usando a **mediana** do NDVI no trecho (robusta a pixels de asfalto/sombra) em vez da média.
- Correção para NDVI saturado: acima de 0,80 a relação NDVI→altura perde sensibilidade; o sistema passa a usar SAVI nesse regime e marca "saturação espectral — validar em campo".
- Incerteza por trecho, em vez de ±13 cm fixo: combina o erro residual do modelo (13 cm) com a variabilidade do próprio trecho (`90 × desvio-padrão do NDVI / √pixels válidos`) e com a idade da leitura (cresce a cada dia sem imagem nova, usando a taxa de crescimento já usada no clima). Exemplo: trecho homogêneo com 800 pixels → ±13 cm; trecho heterogêneo com 30 pixels → ±19 cm.
- A zona de decisão e os relatórios passam a usar essa incerteza real por trecho.
- Toda comparação e classificação (status, IRC, planejamento) usa o mesmo valor arredondado uma única vez, eliminando divergências entre telas.

### 3. IRC e status sem inconsistências
- NDVI normalizado com teto em 0,80 (saturação) e piso em 0,15 (solo/asfalto) — alinhado ao modelo de altura.
- Idade da roçada calculada por data civil (fuso de São Paulo), não por horário do navegador.
- Chuva prevista deixa de ser somada como 0 quando o clima não carregou: o peso da chuva é redistribuído proporcionalmente aos demais e a tela indica "sem previsão".
- Status derivado da altura usa `≥` de forma consistente em todos os lugares (hoje já é, será coberto por testes).

### 4. Protótipo (MAE/RMSE) honesto
- Comparação só entre **leitura de satélite** e **medição de campo em cm** (tabela nova `field_height_measurements`, preenchível pela tela de observações do trecho). Sem medições, a tela mostra "calibração pendente — N medições necessárias" em vez de números.
- Quando houver ≥ 10 medições pareadas, o sistema recalcula a incerteza (RMSE) e a exibe como versão v1.1 do modelo, com data.

### 5. Transparência
- Selo do trecho passa de "estimado" genérico para "Sentinel-2 · leitura de DD/MM · N cenas · ±X cm".
- Demais rodovias continuam com o selo "dado demonstrativo" (não são tocadas).

## Detalhes técnicos

- Migração: `segment_satellite_readings` (segment_id, read_at, period_start, period_end, images, valid_pixels, ndvi_median/mean/std/min/max, evi_median, savi_median, buffer_m, model_id, model_version, altura_cm, uncertainty_cm, origin) e `field_height_measurements` (segment_id, measured_at, altura_cm, autor, created_by). GRANTs + RLS: leitura para autenticados, escrita de leituras só via service_role; medições de campo inseridas por operador/admin.
- Colunas novas em `segments`: `ndvi_source` (`seed` | `sentinel2`), `last_satellite_read_at`, `uncertainty_cm`.
- Função `gee-refresh-segments`: reutiliza o código do `gee-ndvi` movido para `_shared/gee.ts`; processa em lotes de 5 com pausa para respeitar cota do Earth Engine; exige usuário autenticado (botão) ou chave de cron; grava `audit_log` com antes/depois por trecho.
- Cron: `pg_cron` + `pg_net` chamando a função semanalmente.
- Front: `src/lib/height-model.ts` ganha `estimateHeight({ ndviMedian, savi, ndviStd, validPixels, ageDays })` retornando `{ cm, uncertaintyCm, saturated }`; `uncertainty.ts` consome a incerteza do trecho; `irc.ts` ajustado; hooks `useSegments`/`useSegment` leem as novas colunas; `Prototipo.tsx` usa `field_height_measurements`.
- Testes: casos para saturação, propagação de incerteza, redistribuição de pesos e paridade front/back da fórmula.

## Validação
- Rodar a atualização manual e conferir que os 40 trechos do SP-021 recebem NDVI/altura reais com leitura salva; demais rodovias inalteradas; nenhuma ordem de serviço tocada.
- Conferir que dashboard, mapa, relatório e PDF mostram a mesma altura/incerteza para o mesmo trecho.
