# Métrica composta de vegetação (NDVI + EVI + SAVI/SRVI): é válido?

## Resposta curta

A ideia é válida como formulação, mas **hoje os dados não sustentam pesos numéricos**. Antes de fixar α, β e γ é preciso resolver duas coisas que foram verificadas agora no banco:

1. **Não existe variável-alvo.** A tabela de medições de altura em campo está com **0 registros**. Sem altura medida em campo não há como calibrar pesos por correlação, regressão ou otimização de erro — qualquer peso seria arbitrário.
2. **Os índices são quase perfeitamente redundantes.** Nas 80 leituras Sentinel-2 já gravadas (Rodoanel SP-021):
   - correlação NDVI × EVI = **0,995**
   - correlação NDVI × SAVI = **0,996**
   - correlação EVI × SAVI = **0,999**

   Com correlação nessa faixa, a combinação ponderada de três índices produz praticamente o mesmo ranking que o NDVI sozinho. Além disso, o **SRVI (razão simples NIR/RED) é uma transformação algébrica exata do NDVI** (`SR = (1+NDVI)/(1−NDVI)`) — ele não acrescenta informação nova, apenas reescala.

Conclusão: o ganho de uma métrica composta é marginal enquanto os índices vierem todos do par NIR/RED. O caminho matematicamente honesto é implementar a formulação **genérica com incógnitas**, deixar os pesos serem estimados pelos dados quando houver campo, e mostrar explicitamente a redundância.

## O que será construído

### 1. Módulo matemático da métrica composta (`src/lib/vegetation-metric.ts`)

- **Normalização** de cada índice para 0–1 antes de combinar, por padronização robusta (mediana e IQR do próprio conjunto de leituras) seguida de recorte no intervalo — evita que EVI, cuja escala vai a 2,5, domine por escala e não por relevância.
- **Fórmula geral:** `M = (α·nNDVI + β·nEVI + γ·nSAVI) / (α + β + γ)`, com M em 0–1 e pesos não negativos.
- **Três modos de peso**, escolhidos automaticamente pelo que os dados permitem:
  - `igual` — α=β=γ=1 (estado atual, sem campo);
  - `pca` — pesos proporcionais às cargas do primeiro componente principal dos índices normalizados (usa só a estrutura dos dados, sem alvo);
  - `regressao` — pesos por mínimos quadrados não negativos contra a altura medida em campo, disponível apenas quando houver amostras suficientes.
- Cada resultado carrega o modo usado, o número de amostras e um aviso quando os pesos não são estatisticamente justificados.

### 2. Diagnóstico estatístico (`src/lib/vegetation-correlation.ts`)

Matriz de correlação de Pearson e Spearman entre índices, fator de inflação de variância (VIF) e variância explicada pelo primeiro componente. É isso que responde, com número, "há redundância?" e "vale a pena somar três índices?".

### 3. Tela de análise (nova aba na página Protótipo)

- Matriz de correlação dos índices sobre as leituras reais do SP-021.
- Pesos sugeridos por PCA e, quando houver campo, por regressão — lado a lado com o modo igual.
- Erro (MAE/RMSE) de cada configuração contra as medições de campo; sem campo, mostra "calibração pendente — N medições necessárias" em vez de números.
- Exemplo numérico ao vivo de um trecho: índices brutos → normalizados → M final.

### 4. Registro de altura medida em campo

Formulário simples na página do trecho para lançar altura em cm com data e autor, alimentando a tabela que hoje está vazia. É o que destrava a calibração real dos pesos. Meta mínima para estimar três pesos com sentido: **≥ 30 medições pareadas**, distribuídas entre trechos altos e baixos.

### 5. O que NÃO muda agora

A altura operacional continua vindo do modelo NDVI atual `(NDVI − 0,15) × 90`, com a incerteza por trecho já implementada. A métrica composta entra como **indicador analítico paralelo**, sem alterar status, IRC, ordens de serviço ou alertas — até ser validada contra campo.

## Detalhes técnicos

- `vegetation-metric.ts`: `normalizeIndex()`, `compositeMetric({ ndvi, evi, savi, weights })`, `fitWeightsPCA(rows)`, `fitWeightsNNLS(rows, fieldHeights)`; sem dependências novas (potência iterada para o primeiro componente, projeção-gradiente com clamp ≥ 0 para NNLS).
- `vegetation-correlation.ts`: Pearson, Spearman, VIF via R² de cada índice contra os demais, `explainedVarianceFirstPC`.
- SRVI: adicionado a `spectral-indices.ts` como `srvi = NIR/RED`, documentado como monotônico em NDVI; entra no diagnóstico de correlação, mas por padrão fora da combinação (colinearidade exata com NDVI).
- Fonte de dados: `segment_satellite_readings` (ndvi/evi/savi_median, valid_pixels) pareada por `segment_id` com `field_height_measurements`; leituras com < 20 pixels válidos ficam fora do ajuste.
- Testes: invariância de escala da normalização, M ∈ [0,1], pesos iguais reproduzem a média simples, colinearidade perfeita detectada pelo VIF, NNLS recupera pesos conhecidos em dado sintético.

## Limitações que serão exibidas na tela

- NDVI, EVI, SAVI e SRVI derivam das mesmas bandas (NIR/RED, + BLUE no EVI): redundância é esperada e medida em 0,99 aqui.
- Sem medição de campo, nenhum conjunto de pesos pode ser chamado de "ótimo" — apenas "sem alvo, pesos por estrutura".
- PCA maximiza variância, não capacidade preditiva de altura; serve de ponto de partida, não de calibração.
- Saturação acima de NDVI 0,80 continua sendo tratada pelo SAVI, como já ocorre hoje.

## Alternativa se a correlação simples não bastar

Se, com campo em mãos, a combinação linear não melhorar o erro frente ao NDVI puro, o próximo passo é trocar o alvo da modelagem: usar bandas SWIR (B11/B12, sensíveis a biomassa e umidade, pouco correlacionadas com NIR/RED) e índices como NDMI/NBR, ou uma regressão não linear (por exemplo curva logística sobre NDVI com termo de tempo desde a última roçada), em vez de continuar somando índices do mesmo par de bandas.
