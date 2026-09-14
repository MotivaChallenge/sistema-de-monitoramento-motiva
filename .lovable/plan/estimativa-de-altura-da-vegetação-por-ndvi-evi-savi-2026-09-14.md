# Estimativa de altura da vegetação por NDVI + EVI + SAVI

Hoje a altura é estimada só pelo NDVI: `altura = (NDVI − 0,15) × 90`. Nos seus dois pontos reais isso erra muito (rotatória daria ~21 cm contra 9 cm medidos). A proposta troca essa conta por um índice composto dos três índices, calibrado com as medições de campo que você fez.

## O que muda

1. **Índice composto de vegetação (V)** — nova etapa intermediária:
   `V = 0,20 × NDVI + 0,55 × EVI + 0,25 × SAVI`, com os pesos em um único ponto de configuração e validação de que somam 1.

2. **Estimador de altura** — módulo próprio, substituível:
   `H = a × V + b`, calibrado nos dois pontos conhecidos (a ≈ 210,3; b ≈ −41,7), nunca negativo.
   A arquitetura já aceita, sem mexer nas telas, trocar para regressão múltipla (β0 + β1·NDVI + β2·EVI + β3·SAVI) quando houver mais pontos — com 2 pontos ela seria indeterminada, então fica preparada, não ativada.

3. **Heterogeneidade** — quando o local tem várias medições de campo, o sistema calcula média, mínimo, máximo e desvio padrão e classifica a variação (baixa / moderada / alta). Isso é descrito como variação da área, não como erro do satélite.

4. **Confiança** — derivada da variação relativa (desvio ÷ média), com proteção para alturas muito baixas: alta (<20%), média (20–40%), baixa (≥40%). Sem medição de campo, a confiança é apresentada como não determinada.

5. **Nível de manutenção** — limites configuráveis: até 10 cm normal, até 25 cm atenção, até 40 cm necessita manutenção, acima disso crítico. Entra **ao lado** da avaliação contratual atual (limite de 30 cm), que continua decidindo conformidade — nada do fluxo de ordens de serviço e alertas muda.

6. **Defasagem temporal** — quando houver data da imagem e data da medição, o sistema mostra a diferença em dias e um aviso quando ela for grande. Não altera a altura estimada, apenas sinaliza a limitação (caso da rotatória).

7. **Painel "Como foi calculado?"** — mostra os índices brutos, o índice composto, a fórmula aplicada, a altura estimada, a faixa observada em campo, a heterogeneidade, a confiança e o status, com o passo a passo numérico.

8. **Validação dos dois testes** — tela comparando altura real × estimada, com erro em cm e em porcentagem, pronta para receber os testes 3, 4, 5…

## Os dois pontos de calibração

| Ponto | NDVI | EVI | SAVI | V | Campo (cm) | Média |
|---|---|---|---|---|---|---|
| Rotatória | 0,380 | 0,216 | 0,203 | ≈0,241 | 4, 8, 11, 13 | 9,0 |
| Sítio | 0,458 | 0,413 | 0,320 | ≈0,386 | 30, 49 | 39,5 |

Os dois entram como medições de campo reais no banco (com data da imagem e data da medição), para que novos pontos possam ser adicionados pela interface e a calibração seja refeita automaticamente. As fotos enviadas ficam registradas como evidência do ponto.

## Detalhes técnicos

- Novo `src/lib/composite-height.ts`: `VEGETATION_WEIGHTS`, `MAINTENANCE_THRESHOLDS`, `compositeVegetationIndex()`, `estimateHeight(ndvi, evi, savi)`, `fieldStats()`, `heterogeneity()`, `confidence()`, `maintenanceLevel()`, `temporalQuality()`, `CALIBRATION_POINTS` e `validateCalibration()`. Retorno único e serializável com todos os passos intermediários, para a UI não recalcular nada.
- Calibração linear via os utilitários já existentes em `src/lib/calibration.ts` (`fitLinear`, LOOCV), agora sobre V em vez de NDVI puro; com 2 pontos o ajuste é exato e o módulo marca `publishable: false` / confiança baixa para não simular precisão estatística.
- `src/lib/vegetation-metric.ts` (pesos por PCA/NNLS) continua como diagnóstico; o novo módulo é o caminho de produção da altura. Sem duplicação de matemática: normalização e correlação seguem vindo dos módulos atuais.
- Migração: colunas de metadados em `field_height_measurements` (data da imagem de satélite pareada, tipo de local, defasagem em dias) e inserção dos dois pontos; `height_model_calibration` recebe a versão `v3-composto`.
- UI: novo card "Estimativa de altura por índices" em `src/pages/Segmento.tsx` e `src/pages/Relatorio.tsx`, com o detalhamento do cálculo; `FieldMeasurementForm` passa a aceitar a data da imagem pareada. `DecisionZone`, `SegmentTable`, alertas e ordens de serviço permanecem como estão.
- Testes em `src/test/composite-height.test.ts`: os dois pontos (V ≈ 0,241 → ~9 cm; V ≈ 0,386 → ~39,5 cm), zeros, valores ausentes/inválidos, altura negativa truncada em 0, pesos que não somam 1, índices fora de faixa, nenhuma/uma/várias medições de campo e defasagem temporal grande. Os testes atuais continuam passando.

## Limitações que ficam registradas na tela

- Dois pontos de campo não definem um modelo universal: a reta é prova de conceito e será recalibrada a cada novo ponto.
- A margem mostrada é a variação das amostras de campo, não um intervalo de confiança estatístico.
- A imagem Sentinel da rotatória pode não ser do mesmo dia da medição; isso aparece como observação no ponto.
