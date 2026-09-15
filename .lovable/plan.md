# Recalibrar a estimativa de altura com as medições de hoje

Objetivo: reduzir o erro nos pontos medidos para no máximo 3 cm, usando as quatro réguas fotografadas hoje no ponto -23,547778 / -46,755083, sem inventar precisão que os dados não sustentam.

## O que muda

1. **Entrada das medições de hoje**
   As leituras lidas nas fotos (aprox. 36, 30, 30 e 33 cm, data 15/09/2026) substituem o par antigo (30 e 49 cm) do ponto "Sítio". O valor 49 cm era um caso isolado que puxava a média para cima e é a causa principal da superestimativa de ~8 cm.

2. **Ajuste da reta**
   A relação índice de vegetação → altura é recalculada com os pontos de campo atualizados. Com a média de campo passando de 39,5 cm para ~32 cm, a reta fica mais baixa e o erro nos dois pontos volta a zero (ajuste exato com dois pontos).

3. **Controle honesto do erro (o ponto central)**
   Como duas retas passando por dois pontos sempre acertam esses pontos, o sistema passa a medir o erro por **validação deixando um ponto de fora** e a comparar a estimativa com **cada régua individual**, não só com a média. O resultado é um número real de imprecisão, não um zero artificial.
   - Critério de aprovação: erro médio absoluto por régua ≤ 3 cm.
   - Se o erro ficar acima de 3 cm com a reta simples, entra um segundo passo: ancorar o modelo também na variabilidade do local (usar a mediana das réguas em vez da média, que é menos sensível a folhas isoladas mais altas) e reavaliar.
   - Se ainda assim não couber em 3 cm, a tela mostra o erro verdadeiro em vez de afirmar 3 cm. Não haverá ajuste artificial para forçar o número.

4. **Transparência na tela**
   O painel de estimativa passa a mostrar: altura estimada, média e faixa das réguas do local, erro atual do modelo em centímetros e quantos pontos sustentam a calibração. A frase sobre prova de conceito continua enquanto houver menos de 6 locais medidos.

## Limitações que ficam registradas

- A altura da vegetação varia dentro do mesmo local (hoje: 30 a 36 cm no mesmo ponto). Nenhum modelo pode ser mais preciso que essa variação natural.
- A data da imagem de satélite dos dois pontos ainda é desconhecida; enquanto não for informada, o aviso de possível defasagem permanece.
- Com apenas dois locais, um erro pequeno nos pontos medidos **não** prova erro pequeno em trechos novos da rodovia. Isso continua escrito na tela.

## Detalhes técnicos

- `src/lib/composite-height.ts`: atualizar `CALIBRATION_POINTS.test-02` com `fieldMeasurementsCm: [36, 30, 30, 33]`, `fieldMeasurementDate: "2026-09-15"`, `locationType: "rural"`; adicionar `modelErrorStats()` (erro absoluto médio e máximo por régua individual + LOOCV) e `ERROR_TARGET_CM = 3`.
- Opção de robustez: parâmetro `centralTendency: "mean" | "median"` usado no ajuste, ativado só se o erro por régua exceder 3 cm.
- `src/test/composite-height.test.ts`: novos casos — erro por régua ≤ 3 cm nos pontos atuais, média vs. mediana, ponto com régua discrepante, medições vazias, e a garantia de altura nunca negativa.
- `src/components/vegia/CompositeHeightPanel.tsx`: exibir erro médio absoluto em cm, faixa das réguas e número de pontos de calibração.
- Verificação: `bunx tsgo --noEmit` e `bunx vitest run`.

## Confirmação necessária

As leituras 36, 30, 30 e 33 cm foram tiradas visualmente das fotos. Se os valores anotados em campo forem outros, me passe os números exatos antes da recalibração.
