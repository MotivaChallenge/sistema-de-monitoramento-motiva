# Concluir Configurações: limiares de altura + validação visual

Falta ligar os limiares de altura (atenção / crítico) à classificação dos trechos e confirmar no navegador que tema e densidade realmente mudam.

## 1. Limiares de altura passam a valer

Hoje o status de cada trecho (`conforme` / `atenção` / `crítico`) vem pronto do banco e ignora os valores configurados em Configurações. A mudança:

- O status exibido passa a ser derivado no cliente: altura ≥ altura crítica → crítico; altura ≥ altura de atenção → atenção; abaixo disso → conforme.
- Vale para todas as telas que leem trechos: Dashboard, Mapa, Relatório, Segmento, Planejamento, Alertas, contadores do cabeçalho e faixas do mapa de calor.
- O valor original do banco continua guardado; a página do trecho mostra uma nota quando o status calculado difere do registrado, para não parecer inconsistência de dados.
- Alterar os limiares em Configurações e salvar reclassifica os trechos imediatamente, sem recarregar.

## 2. Validação visual no navegador

- Abrir Configurações, trocar para Escuro e confirmar que fundo, cards, sidebar e gráficos ficam legíveis (contraste em textos secundários e badges de status).
- Trocar a densidade para Compacta e conferir que a escala reduz sem quebrar tabelas nem o cabeçalho.
- Recarregar a página para confirmar que tema, densidade e pesos persistem.
- Ajustar qualquer token de cor do tema escuro que fique com contraste insuficiente.

## Detalhes técnicos

- Novo helper em `src/lib/irc.ts` (ou `src/lib/status.ts`): `statusFromAltura(altura, { atencao, critico })`.
- `SettingsProvider` publica os limiares ativos da mesma forma que já faz com os pesos do IRC (`setHeightThresholds`), para que o mapeamento de trechos os use sem passar props.
- `mapSegment` em `src/hooks/useVegiaData.ts` calcula `status` a partir da altura e mantém `statusBanco` no objeto; `Segment` em `src/types/domain.ts` ganha esse campo opcional.
- Invalidar as queries de trechos quando os limiares mudarem, para reclassificar na hora.
- Sem migração de banco e sem alteração de rotas.
- Verificação: `tsgo --noEmit`, testes existentes e checagem visual via navegador headless com captura de tela nos temas claro e escuro.
