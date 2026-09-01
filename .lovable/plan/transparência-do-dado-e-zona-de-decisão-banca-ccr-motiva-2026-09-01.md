# Transparência do dado e zona de decisão (banca CCR Motiva)

Resposta direta ao feedback: mostrar como o dado é capturado e nunca apresentar a altura estimada como medição centimétrica exata. Tudo incremental, sem apagar dados, sem alterar ordens existentes e sem remover páginas.

## O que será construído

### 1. Painel "Fonte e qualidade do dado" (P0)
Novo componente reutilizável com resumo sempre visível: fonte (Sentinel-2 SR Harmonized), processamento (Google Earth Engine), período analisado, número de imagens, composição (mediana temporal), filtro de nuvens (CLOUDY_PIXEL_PERCENTAGE < 60), máscara SCL (classes 4,5,6,7,11), resolução nativa 10 m, buffer 150 m, pixels válidos e data/hora da atualização. Esses valores já vêm da função `gee-ndvi`; quando não houver leitura orbital para o ponto, o painel mostra o rótulo "dados demonstrativos" em vez de inventar números.

Texto fixo no painel: o satélite não mede altura em centímetros; a altura é estimativa calibrada por modelo e exige validação de campo perto do limite contratual.

Botão "Ver metodologia completa" abre um diálogo com a metodologia estendida (índices NDVI/EVI/SAVI, modelo de altura e versão, aviso de que a grade de 5 m é reamostrada e não é precisão real de 5 m, regra de encaminhamento para campo, aviso de apoio à decisão).

Aparece em: Dashboard, Mapa (detalhe do ponto), Detalhe do Segmento e Relatório.

### 2. Zona de decisão com incerteza (P0)
Componente reutilizável que exibe, lado a lado: altura estimada, margem de incerteza, limite contratual do trecho, decisão recomendada e se precisa validação de campo.

Três estados:
- claramente abaixo do limite → "Baixo risco — monitoramento remoto"
- dentro da faixa limite ± incerteza → "Zona de validação — confirmar em campo"
- claramente acima → "Alto risco — priorizar inspeção/intervenção"

Formato: "Estimativa: 27 cm ± 13 cm · Limite: 30 cm · Zona de decisão: validar em campo". Sem incerteza calibrada para o segmento, exibe: "Margem de incerteza ainda não calibrada para este segmento. A decisão contratual exige validação de campo."

Usado no Dashboard, detalhe do mapa, detalhe do segmento, relatório e análise visual.

### 3. Selos de origem do dado (P0)
Selo obrigatório em cards, tabelas e detalhes: MEDIDO EM CAMPO · ESTIMADO POR SATÉLITE + MODELO · DETECTADO POR VISÃO COMPUTACIONAL · VALIDADO EM CAMPO · DADO DEMONSTRATIVO. A origem é derivada da procedência já existente (medições de inspeção = campo, segmentos = satélite+modelo, cv_results = visão computacional).

Filtro por origem nos filtros globais e na tabela de segmentos (todos / campo / estimado / pendente de validação). No relatório, aviso de que ponto conforme estimado não equivale a ponto medido em campo.

### 4. Metodologia no relatório e no PDF (P1)
Seção "Metodologia e limitações" no fim do relatório e como anexo técnico na última página do PDF (indicadores continuam na primeira página). Rodapé do PDF passa a trazer origem do dado e data/hora de geração. Tabela de segmentos do PDF ganha coluna de origem. Exportação CSV mantida, com coluna de origem adicionada.

### 5. Planejamento: "Por que esta alocação?" (P1)
Painel por equipe/trecho com IRC, criticidade e altura estimada, distância base→trecho, km e tempo estimado de deslocamento, capacidade diária, região, prazo/SLA e motivo de outra equipe não ter sido priorizada. Resumo de utilização com km, número de trechos e horas estimadas (não apenas "100%"). Trechos atribuídos a mais de uma equipe são sinalizados como possível conflito antes de gerar OS.

### 6. Prazos e coerência temporal (P1)
Ordens com `scheduled_for` anterior à data do sistema passam a exibir "ATRASADA" e o número de dias de atraso; distinção visual entre prazo passado, hoje e futuro; SLA e prioridade juntos; novo filtro "Atrasadas"; indicador de ordens vencidas no dashboard. Base com datas históricas é rotulada como "base demonstrativa". Nenhuma ordem é alterada — apenas leitura.

### 7. Cláusula e limite explicados (P1)
Em cada segmento do relatório e no detalhe: cláusula aplicada, limite específico daquele ativo (30/45/60 cm), altura observada ou estimada, status resultante e frase curta da regra usada, deixando claro quando a regra geral de 30 cm não se aplica.

### 8. Análise visual rastreável (P1)
Cada card de detecção passa a mostrar fonte da imagem (orbital/drone/terrestre), data e hora da captura, coordenada ou trecho, tipo de captura, modelo e versão, confiança; botões "Ver antes/depois" (quando houver par comparável) e "Enviar para validação de campo"; vínculo com alerta/OS existente. Imagens ilustrativas recebem o selo DADO DEMONSTRATIVO.

### 9. Auditoria das configurações (P2)
Mantém pesos e limiares atuais. Adiciona aviso de impacto antes de salvar, campo opcional "Motivo da alteração", registro em audit_log com usuário, data/hora, valor anterior e novo, e exibição da versão do cálculo usada nos relatórios (relatório histórico indica a versão do parâmetro). As validações de soma 100% e crítico ≥ atenção já existem e serão reforçadas na interface.

### 10. Modo demonstração (P2)
Área discreta (atalho no header) que apenas navega: caso crítico, caso em atenção e caso conforme pré-selecionados, roteiro curto captura → análise → priorização → planejamento, destacando fonte do dado e zona de validação. Não gera ordens nem altera dados.

### 11. Mensagem de posicionamento
Frase fixa no painel de fonte e no rodapé do relatório: sensoriamento remoto reduz a área de busca e direciona equipes; a decisão contratual permanece rastreável e, perto do limite, o ponto vai para validação de campo.

## Detalhes técnicos

- Novos componentes: `DataSourcePanel`, `MethodologyDialog`, `DecisionZone`, `DataOriginBadge`, `AllocationRationale`, `DemoModeMenu`.
- Novo módulo `src/lib/data-provenance.ts` (origem do dado + rótulos) e `src/lib/uncertainty.ts` (faixa de decisão a partir de altura, limite e incerteza do modelo, hoje ±13 cm documentado em `src/lib/height-model.ts`; sem valor calibrado retorna "não calibrada").
- Metadados de qualidade reaproveitados de `useGeeNdvi` / função `gee-ndvi` (período, imagens, composição, máscara, pixels válidos, resolução).
- `src/lib/pdf-export.ts` ganha a seção de anexo e o rodapé; assinatura de entrada estendida sem quebrar a chamada atual em `Relatorio.tsx`.
- Sem migrações destrutivas. Se for preciso persistir "validado em campo" e "motivo da alteração", entram como novas colunas/linhas aditivas com GRANT e RLS; nada existente é apagado.
- Verificação após cada grupo: typecheck, build e navegação nas rotas principais em desktop e mobile.

## Fora de escopo
Recalibração estatística real do modelo de altura (exige dados de campo pareados); o sistema passa a declarar a incerteza em vez de afirmar precisão.
