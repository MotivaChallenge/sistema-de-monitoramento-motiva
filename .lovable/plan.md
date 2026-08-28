# Versão mobile — campo e supervisão em trecho

App instalável na tela inicial (PWA sem modo offline), com duas experiências mobile: equipe de campo e supervisor.

## Navegação mobile

Sidebar atual só aparece em desktop; no celular há apenas o botão de menu. Substituir por uma barra inferior fixa com 5 destinos, definida pelo perfil:

```text
EQUIPE DE CAMPO
  Minhas OS | Mapa | Registrar | Alertas | Mais

SUPERVISOR
  Painel | Mapa | Ordens | Equipes | Mais
```

- "Mais" abre a gaveta com o restante (Relatórios, Planejamento, Previsões, Notificações, Configurações, Sair).
- Botão central "Registrar" em destaque para abrir uma nova ocorrência/OS de qualquer tela.
- Áreas de toque de no mínimo 44px, respeitando a área segura do iPhone.
- O perfil vem da tabela de papéis do usuário; sem papel definido, usa a visão de supervisor.

## Telas adaptadas

- **Minhas OS (campo)**: lista em cards ordenada por proximidade/prioridade, abas Hoje / Pendentes / Concluídas, ação de concluir em um toque com confirmação.
- **Detalhe da OS**: KM, trecho, foto, observação, botão grande "Concluir".
- **Mapa**: tela cheia, controles em bottom sheet arrastável (camadas, filtros, resumo), botão "Onde estou" centralizando no trecho mais próximo. Lista lateral vira sheet.
- **Painel (supervisor)**: cards empilhados, carrossel de KPIs, prioridades com ação direta, clima e NDVI abaixo.
- **Tabelas** (Relatório, Equipes, Notificações): viram listas de cards no celular; nada de rolagem horizontal.
- **Cabeçalho**: compacto, com rodovia selecionada, data e contadores de críticos/alertas.

## Câmera e GPS

- **Foto**: captura direta pela câmera ao registrar ou concluir uma OS, com compressão antes do envio e armazenamento no bucket de anexos do backend.
- **GPS**: ao registrar, preenche automaticamente coordenadas e sugere o KM/trecho mais próximo (usando a interpolação de quilometragem já existente); no mapa, botão de "minha posição".
- Permissões pedidas só no momento do uso, com aviso claro e alternativa manual (informar KM na mão) se o usuário recusar.

## Instalação na tela inicial

- Manifesto do app, ícones, cor de tema e tags de cabeçalho para permitir "Adicionar à tela de início" no iPhone e instalação no Android.
- Sem modo offline nesta etapa — o app precisa de conexão.

## Detalhes técnicos

- Barra inferior nova em `src/components/vegia/MobileTabBar.tsx`, montada em `AppLayout` sob `md`; sidebar desktop inalterada.
- Perfil resolvido por hook (`useOperator`/papéis) para escolher o conjunto de abas.
- Bottom sheets com `Sheet`/`Drawer` do shadcn já disponíveis; `useIsMobile` para alternar tabela ↔ cards.
- Fotos: `<input type="file" capture="environment">` + redimensionamento no cliente; novo bucket de storage com políticas por usuário autenticado.
- GPS: `navigator.geolocation` + `src/lib/km.ts` para mapear coordenada → KM/segmento.
- PWA: `public/manifest.webmanifest` + ícones em `public/`, tags no `index.html`. Sem service worker, sem `vite-plugin-pwa`.
- Colunas novas na tabela de ordens de serviço para foto e coordenadas de registro, com GRANTs e RLS correspondentes.
