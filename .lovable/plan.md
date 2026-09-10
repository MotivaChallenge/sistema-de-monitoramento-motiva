# Transparência da incerteza e limpeza de interface

Resposta ao briefing da banca. Nada é removido, nenhum dado é inventado e nenhum número de incerteza é reduzido artificialmente. O foco é: (a) tratar a incerteza como faixa de decisão em todos os módulos, (b) corrigir os defeitos reais de interface confirmados no código, (c) tornar metodologia e recorte visíveis.

## O que já existe (verificado no código)
- Regra de faixa (estimativa ± incerteza contra o limite) já existe em `src/lib/uncertainty.ts` e no card `DecisionZone`, com os três estados pedidos.
- Metodologia completa já existe em `src/lib/methodology.ts` + `MethodologyDialog`.
- Selos de origem (campo / satélite+modelo / visão computacional / validado / demonstrativo) já existem em `DataOriginBadge`.
- Incerteza já é calculada por trecho na leitura orbital (variabilidade, nº de pixels, idade, saturação), não é um ±13 cm fixo — o 13 cm é apenas o resíduo base do modelo.

Portanto o trabalho é de completude, consistência e comunicação, não de reconstrução.

## Defeitos confirmados a corrigir
1. **Título errado em /notificacoes**: a rota não está no mapa de títulos de `RouteSeo.tsx` e cai no fallback "Página não encontrada". Mesmo caso para `/notificacoes` e qualquer rota nova. Corrigir e adicionar teste de cobertura de rotas.
2. **"KM KM 3+000"**: o campo `km` do trecho já vem com o prefixo "KM"; vários lugares concatenam "KM" de novo (`recommendations.ts`, `Previsoes.tsx`, `AnaliseCV.tsx`, entre outros). Criar um formatador único e usá-lo em todos os pontos.
3. **"Roçada" sem acento** em rótulos visíveis (chaves internas e nomes de tabela ficam como estão).
4. **Placeholders "—"** em "Nº de imagens", "Pixels válidos" e "Atualização" no painel de fonte do dado. Passar a exibir "não calculado nesta execução" com explicação em tooltip, distinguindo "sem leitura orbital" de "leitura sem esse metadado".

## Incerteza: o que muda
- Padronizar o vocabulário: sempre "Incerteza estimada da altura: ± X cm", nunca "precisão". Tooltip único explicando que é margem estatística do modelo, não resolução do satélite nem medição contratual.
- Renomear os estados de decisão para a linguagem pedida: "Provavelmente conforme", "Zona de incerteza — validar em campo", "Provavelmente não conforme". Nenhum texto declara conformidade contratual definitiva a partir de estimativa.
- Novo componente **barra de faixa**: eixo 0 → limite contratual → faixa provável (h−u a h+u) → marcador da altura estimada. Usado em Dashboard, Mapa, Previsões, Segmento e Relatório.
- Card de decisão passa a mostrar sempre: altura estimada, faixa provável, limite, classificação, ação recomendada, evidência (origem) e a frase de confirmação presencial.
- **Metadados de validação do modelo**: nova tabela de versões do modelo (versão, data de calibração, tamanho de amostra, amostra de validação, MAE, RMSE, viés, nível de confiança, incerteza, método, data da última validação de campo). Sem linhas com métricas reais, a interface exibe "Validação quantitativa pendente — usar para triagem e priorização, com confirmação em campo". Nenhum valor é preenchido de forma fictícia.

## Interface
- **Faixa fixa de contexto** em todas as telas: rodovia/recorte, período, última atualização, origem predominante e modo (operacional × demonstrativo).
- **Dashboard**: agrupar os cards em quatro blocos (situação da malha, qualidade do dado, decisão operacional, capacidade das equipes); mais respiro vertical; contraste maior em textos secundários; cada número ganha o universo ("177 críticos de 471 segmentos no recorte"); carrossel substituído por lista com título, contador e botões nomeados; botão renomeado para "Atualizar leitura Sentinel-2" com aviso do que dispara.
- **Mapa**: cabeçalho com recorte ("Rodoanel SP-021 · 29,3 km · 40 segmentos"), legenda textual das camadas, estado selecionado distinto dos status, skeleton enquanto os tiles carregam, e GeoJSON exportado com origem, timestamp, recorte, versão do modelo e incerteza.
- **Notificações**: contagem de não lidas consistente entre menu, cabeçalho e central; ações nomeadas; remoção com desfazer por aviso temporário.
- **Ordens e Planejamento**: motivo do atraso e marcação de base histórica/demonstrativa; filtro inicial "críticas abertas" com resumo de atrasadas; painel de capacidade total, usada, folga e sobrecarga; explicação da diferença entre equipes cadastradas, disponíveis e alocadas; botão de gerar ordens com estado de processamento e proteção contra duplicidade.
- **Relatório**: cabeçalho com recorte, período, fonte, execução, cenas e pixels válidos; colunas e selos separando medido em campo de estimado; CSV com `data_execucao, fonte, origem, cenas_validas, pixels_validos, altura_estimada_cm, incerteza_cm, limite_cm, status_decisao, necessita_validacao_campo`; PDF e CSV respeitando o filtro ativo.
- **Acessibilidade**: status sempre com ícone + texto além da cor; contraste AA; menu recolhido com dica de texto acessível; verificação em 1280, 1024, 768 e 375 px sem rolagem horizontal.

## Detalhes técnicos
- Novos: `src/lib/km-format.ts` (rótulo único de KM), `UncertaintyBar.tsx`, `ContextBar.tsx`, `ModelValidationCard.tsx`; `src/lib/uncertainty.ts` ganha os rótulos novos sem mudar a matemática.
- Migração aditiva: tabela `model_validation` com GRANT e RLS (leitura autenticada, escrita restrita). Nenhuma coluna existente é alterada ou removida.
- `pdf-export.ts` e a exportação CSV/GeoJSON recebem o bloco de procedência e execução.
- Entrega incremental por grupos, com typecheck, testes e conferência visual desktop/mobile ao fim de cada grupo. Auditoria final de textos com "13 cm", "30 cm", "precisão", "incerteza" e "validação", de títulos de rota e de consistência de números entre Dashboard, Mapa, Relatório e Planejamento.

## Fora de escopo
Recalibração estatística real do modelo (depende de medições de campo pareadas, hoje inexistentes na base). O sistema declara a incerteza e a pendência de validação em vez de anunciar precisão.
