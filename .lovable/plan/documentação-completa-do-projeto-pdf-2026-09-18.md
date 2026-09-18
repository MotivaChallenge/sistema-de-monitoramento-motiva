# Documentação completa do projeto (PDF)

Entrega: um documento PDF em Arquivos, com parte executiva (para a banca) e parte técnica detalhada, cobrindo todas as fases do projeto do início até o estado atual — inclusive o que foi descartado e por quê. Nada será alterado na plataforma.

## Estrutura do documento

1. **Capa e resumo executivo** — o que é a plataforma (monitoramento de vegetação na faixa de domínio do Rodoanel SP-021), o problema (conformidade contratual de altura da vegetação, limite de 30 cm, risco de multa ARTESP) e o resultado alcançado.
2. **A ideia** — por que satélite em vez de inspeção manual, o que o sistema decide, quem usa (supervisor, operador), e o princípio adotado: nunca apresentar precisão que os dados não sustentam.
3. **Linha do tempo por fases** — cada fase com: objetivo, o que foi feito, como foi feito, o que mudou de rumo e por quê:
   - Fase 0: protótipo com dados fictícios (telas iniciais, mocks).
   - Fase 1: substituição dos dados fictícios por banco real (trechos, histórico de vegetação, equipes, ordens de serviço, roçadas, alertas).
   - Fase 2: integrações externas — Sentinel-2 via Google Earth Engine, clima, rota real da rodovia, visão computacional, assistente de IA.
   - Fase 3: mapa operacional com traçado real da via e pontos por quilômetro.
   - Fase 4: planejamento e priorização (índice de risco, alocação de equipes, previsões).
   - Fase 5: governança e transparência — origem do dado, auditoria, modo demonstração, rótulos honestos.
   - Fase 6: métrica de vegetação — NDVI, EVI, SAVI, SRVI e a descoberta de que os índices são quase redundantes no trecho.
   - Fase 7: estimativa de altura e calibração com medições de régua em campo.
   - Fase 8: redução do erro de ±13 cm para ±2,9 cm — pesquisa, tentativas descartadas e solução adotada.
   - Fase 9: design system, acessibilidade, SEO e uso em celular.
   - Fase 10: QA por navegação automatizada e testes.
4. **Como a matemática funciona** (explicada em linguagem simples e depois em fórmula):
   - índice composto V = 0,10·NDVI + 0,55·EVI + 0,35·SAVI e por que esses pesos (ruído espectral medido nas leituras reais);
   - reta calibrada H = 163,4·V − 28,2;
   - erro medido por validação cruzada: média 1,0 cm, pior caso 2,9 cm;
   - diferença entre variabilidade natural do capim (~6 cm) e erro do modelo;
   - regra de decisão contra o limite de 30 cm.
5. **O que foi tentado e descartado** — curva de saturação Gompertz, termo de crescimento por dias desde a roçada, modelo físico Beer-Lambert, troca de pesos entre índices: cada um com o motivo numérico da rejeição.
6. **Arquitetura técnica** — telas e rotas, banco de dados (tabelas e finalidade), funções de servidor, bibliotecas de cálculo, testes automatizados, controle de acesso por papel.
7. **Limitações declaradas e próximos passos** — 2 locais de calibração, necessidade de 8 a 10 locais com 5 réguas cada e imagem a até 3 dias da medição, datas de imagem ainda ausentes.
8. **Anexos** — glossário dos termos (NDVI, EVI, SAVI, faixa de domínio, roçada, IRC) e tabela de resultados dos testes de campo.

## Como será produzido

- Levantamento do histórico completo do projeto a partir dos planos arquivados em `.lovable/plan/`, do código atual e dos números reais já apurados.
- Consulta ao banco apenas para leitura, para citar contagens reais (trechos, leituras de satélite, registros de roçada, medições de campo).
- Geração do PDF em Python (ReportLab) em `/tmp`, com fonte Unicode para acentuação e identidade visual da Motiva (verde institucional, tipografia do sistema).
- Conferência página a página em imagem antes de entregar; o arquivo final vai para Arquivos como `documentacao-vegiamap.pdf`.
- Nenhum arquivo do projeto é criado ou modificado.
