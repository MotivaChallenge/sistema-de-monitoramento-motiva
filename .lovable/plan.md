# Reduzir o erro da estimativa de altura — estudo matemático no Rodoanel (SP-021)

Estudo isolado: nada será alterado na plataforma. O resultado é um relatório com o erro real em centímetros.

## Ponto de partida (já verificado)

- 40 trechos do SP-021 com leitura Sentinel-2 real (NDVI, EVI, SAVI).
- 5.652 leituras históricas de vegetação (fev a ago/2026) em 471 trechos.
- 942 registros de roçada (data em que o trecho foi cortado).
- 10 medições de régua em 2 locais (rotatória: 4, 8, 11, 13 cm; sítio: 30, 49, 36, 30, 30, 33 cm).
- No SP-021, NDVI, EVI e SAVI são praticamente o mesmo sinal (correlação 0,994 a 0,999). Hoje o erro por régua é 4,3 cm em média e 14,3 cm no pior caso.

## O que a literatura mostra

- Modelos que chegam a 1,8 a 2,1 cm de erro usam centenas de medições e agregam por talhão, não por pixel isolado ([1](https://doi.org/10.1016/j.jag.2022.102843)).
- Sem esse tipo de calibração local, modelos genéricos ficam em torno de 19 cm de erro ([3](https://research.slu.se/sv/publications/evaluating-lucas-in-situ-and-sentinel-data-for-grass-height-and-v/)).
- A relação índice → altura não é reta: ela satura. Curvas de crescimento (Gompertz/logística) descrevem melhor, e cada índice satura numa altura diferente (SAVI por volta de 40 cm, NDVI e EVI seguem sensíveis até 50 cm) ([4](https://doi.org/10.3390/rs18040554)).

Conclusão: o caminho para reduzir o erro não é trocar os pesos entre NDVI/EVI/SAVI — é mudar a forma da curva e acrescentar o tempo desde a última roçada.

## Fórmula proposta

Três camadas, cada uma testada separadamente para provar o ganho:

1. **Curva de saturação** em vez de reta:
   H = Hmax · exp(−b · exp(−c · V)), com V = índice composto.
   Impede alturas absurdas nos trechos densos (a reta atual chega a extrapolar para valores impossíveis).

2. **Termo de crescimento temporal**: dias desde a última roçada do trecho, cruzados com a série histórica de vegetação. Capim cortado há 15 dias e capim cortado há 90 dias com o mesmo índice não têm a mesma altura — essa é a maior fonte de erro hoje.

3. **Agregação por trecho**: a estimativa vale para a média do trecho, não para um ponto. É assim que a literatura chega a poucos centímetros de erro.

Os pesos entre NDVI, EVI e SAVI passam a ser estimados por regressão, não arbitrados.

## Como o erro será medido (sem autoengano)

- Validação deixando um ponto de fora (o ponto testado nunca participa do ajuste).
- Erro comparado com cada régua individual, não só com a média do local.
- Separação clara entre erro do modelo e variação natural da vegetação dentro do mesmo local (hoje: 4 a 13 cm na rotatória, 30 a 49 cm no sítio).
- Teste final aplicado nos 40 trechos do Rodoanel, verificando se as alturas previstas são fisicamente plausíveis e coerentes com a série histórica.

## O que será entregue

- A fórmula final com os coeficientes ajustados.
- O erro real em centímetros e a precisão em porcentagem, por faixa de altura.
- Comparação honesta: modelo atual × modelo novo.
- Se não chegar a 3 cm com os dados existentes, o número verdadeiro será reportado, junto com quantas medições pareadas faltam para chegar lá.

## Detalhes técnicos

Análise em Python fora do projeto (`/tmp`), lendo os dados por consulta ao banco: `segment_satellite_readings` (NDVI/EVI/SAVI reais), `segment_ndvi_history` (série temporal), `rocada_events` (data de corte), `segments` (limites e metadados) e os 10 valores de régua já conhecidos. Ajuste por mínimos quadrados não linear (scipy), validação LOOCV, métricas MAE/RMSE/R². Nenhum arquivo do projeto é criado ou modificado, nenhuma migração é executada.
