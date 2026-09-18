# Matemática do VegiaMap

Este documento explica, em linguagem simples e depois em fórmulas, como o sistema transforma pixels de satélite em "altura estimada da vegetação" e em recomendações de ação.

> **Premissa central**: o satélite não mede altura. Ele mede luz refletida pelo solo e pela vegetação. A partir dessa informação, construímos um modelo que estima a altura. O modelo tem incerteza, e essa incerteza é parte da decisão.

---

## 1. Dos pixels ao índice composto

### Índices espectrais

O Sentinel-2 captura várias bandas de luz. Combinamos três bandas para obter índices de vegetação:

- **NDVI** — índice clássico de vigor vegetal.
- **EVI** — tenta reduzir saturação em vegetação muito densa e efeitos atmosféricos.
- **SAVI** — corrige o efeito do solo exposto em áreas com pouca vegetação.

No trecho do **Rodoanel SP-021** descobrimos que os três índices são quase a mesma coisa: correlação de **0,994 a 0,999** entre eles. Isso significa que trocar os pesos entre NDVI, EVI e SAVI não melhora o modelo. O ganho veio de outro lugar: o **ruído temporal**.

### Por que esses pesos?

Nas 240 leituras Sentinel-2 dos 40 trechos analisados, o NDVI oscilou bastante de imagem para imagem (desvio mediano de 0,079), enquanto EVI (0,0017) e SAVI (0,0008) foram praticamente estáveis. Por isso reduzimos o peso do NDVI e aumentamos o dos índices mais estáveis:

```text
V = 0,10 · NDVI + 0,55 · EVI + 0,35 · SAVI
```

Com isso, o erro de altura provocado pelo ruído espectral caiu de **0,76 cm** para **0,37 cm** (composto de ~12 imagens), sem alterar o ajuste nos pontos de campo.

---

## 2. Da altura estimada

### Calibração com medições de campo

Usamos duas campanhas de medição com régua:

| Local | NDVI | EVI | SAVI | Réguas (cm) | Média (cm) |
|-------|------|-----|------|-------------|------------|
| Canteiro de rotatória | 0,380 | 0,216 | 0,203 | 4, 8, 11, 13 | **9,0** |
| Sítio (área rural) | 0,458 | 0,413 | 0,320 | 30, 49, 36, 30, 30, 33 | **34,7** |

Aplicando o índice composto V em cada ponto e ajustando uma reta, obtemos:

```text
H = 163,4 · V − 28,2

H  = altura estimada (cm)
V  = 0,10·NDVI + 0,55·EVI + 0,35·SAVI
```

A altura final nunca é negativa:

```text
altura_final = max(0, H)
```

### Erro medido

Validação cruzada deixando uma régua de fora (LOOCV), comparando a estimativa com a **média do trecho**:

| Métrica | Valor |
|---------|-------|
| Erro médio absoluto (MAE) | **1,0 cm** |
| RMSE | **1,3 cm** |
| Pior caso | **2,9 cm** |
| Precisão aproximada | **~97%** |

> **Importante**: esse erro vale para a média do trecho, com pelo menos 5 réguas por local e composição de várias imagens. Uma régua isolada ainda pode variar bastante por causa do capim itself (variação natural de ~6 cm dentro do mesmo local).

---

## 3. Da decisão

### Limite contratual

O limite mais comum é **30 cm**, mas o sistema aceita 45 cm e 60 cm conforme a cláusula do ativo.

### Zona de decisão

A decisão não é binária. Ela considera a altura estimada **e** a incerteza:

```text
limite = 30 cm
incerteza = ±2,9 cm (quando calibrado)

zona = "baixo"      se (altura + incerteza) < limite
zona = "validar"    se (altura − incerteza) < limite ≤ (altura + incerteza)
zona = "alto"       se (altura − incerteza) ≥ limite
```

Na prática:

- **Baixo**: mesmo no pior caso, está abaixo do limite → apenas monitoramento remoto.
- **Validar**: a faixa de incerteza cruza o limite → medição de campo obrigatória antes de decidir.
- **Alto**: mesmo no melhor caso, ultrapassa o limite → priorizar inspeção/intervenção.

Quando o trecho não tem calibração, o sistema declara "incerteza não calibrada" e sempre recomenda validação de campo antes de decisão contratual.

---

## 4. Índice de Risco de Crescimento (IRC)

O IRC combina quatro fatores para priorizar trechos:

```text
IRC = 35·ndviN + 30·alturaN + 20·idadeN + 15·chuvaN

ndviN   = clamp((NDVI − 0,2) / 0,6)
alturaN = clamp(altura / limite)
idadeN  = clamp(dias desde a última roçada / 90)
chuvaN  = clamp(chuva acumulada em 5 dias / 80)
```

Níveis:

| IRC | Nível |
|-----|-------|
| < 35 | Baixo |
| 35–54 | Moderado |
| 55–74 | Alto |
| ≥ 75 | Crítico |

Se não houver previsão de chuva, o peso da chuva é redistribuído proporcionalmente entre os outros fatores, em vez de ser zerado.

---

## 5. O que foi tentado e descartado

Durante o desenvolvimento testamos várias alternativas. Abaixo, o motivo da rejeição de cada uma:

| Ideia | Resultado |
|-------|-----------|
| **Trocar os pesos entre NDVI/EVI/SAVI** | Os índices são quase redundantes no trecho; trocar pesos não reduz o erro. |
| **Curva de saturação de Gompertz** | Na faixa de altura do Rodoanel (0–55 cm) a curva coincide com a reta; só ajudaria a evitar extrapolações absurdas em trechos muito densos. |
| **Termo de crescimento por dias desde a roçada** | A correlação entre dias desde a roçada e NDVI no SP-021 foi praticamente zero (r ≈ 0,013). Não melhorou o modelo. |
| **Modelo físico Beer-Lambert** | Exigia estimar LAI sem calibração local; ao extrapolar, previa alturas impossíveis (> 300 cm). |
| **Modelos separados por tipo de ambiente** | Com apenas 2 locais, não havia evidência para justificar modelos distintos. Manteve-se um modelo geral. |

A solução que funcionou foi a mais simples: **compor várias imagens para reduzir o ruído** e **usar a média de várias réguas por trecho** para estabilizar a variabilidade natural do capim.

---

## 6. Limitações declaradas

1. **Dois locais de calibração** — insuficiente para afirmar que o modelo funciona em todo o Rodoanel. Recomenda-se 8 a 10 locais.
2. **Datas das imagens Sentinel-2** dos pontos de calibração ainda não foram vinculadas; pode haver defasagem temporal.
3. **A precisão de ±2,9 cm vale para a média do trecho**, não para um ponto isolado.
4. **A variação natural da vegetação** dentro de um mesmo local (~6 cm) não é erro do satélite; é a vegetação sendo desuniforme.
5. **Trechos sem EVI/SAVI** caem no modelo antigo (NDVI apenas) com resíduo de ±13 cm.

---

## Referência no código

- `src/lib/height-model.ts` — modelo de altura usado no processamento real do satélite (paridade com `supabase/functions/_shared/height-model.ts`).
- `src/lib/composite-height.ts` — módulo de validação e estatística das medições de campo.
- `src/lib/uncertainty.ts` — regra de decisão com incerteza.
- `src/lib/irc.ts` — Índice de Risco de Crescimento.
- `src/test/height-model.test.ts`, `src/test/composite-height.test.ts` — testes que garantem os números acima.
