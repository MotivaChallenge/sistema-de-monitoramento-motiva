# Projeto mobile-first

Redesenhar o sistema partindo do celular: cada tela é desenhada primeiro para uma mão em campo e depois expandida para tablet/desktop. O layout desktop atual continua funcionando, mas deixa de ser o ponto de partida.

## Princípio

- Estilos base = celular (uma coluna, cards, toque de 44px+, área segura do iPhone); `md:`/`lg:` só acrescentam colunas e densidade.
- Nada de rolagem horizontal, nada de tabela larga no celular.
- Ações principais ao alcance do polegar (parte inferior da tela).

## Navegação

Barra inferior fixa com 5 destinos, variando por perfil; sidebar só a partir de `md`.

```text
EQUIPE DE CAMPO
  Minhas OS | Mapa | Registrar | Alertas | Mais

SUPERVISOR
  Painel | Mapa | Ordens | Equipes | Mais
```

- "Registrar" é o botão central em destaque, disponível de qualquer tela.
- "Mais" abre gaveta com Relatórios, Planejamento, Previsões, Notificações, Configurações e Sair.
- Perfil vem da tabela de papéis; sem papel definido, usa a visão de supervisor.
- Cabeçalho compacto: rodovia, data e contadores de críticos/alertas.

## Telas (versão celular primeiro)

- **Minhas OS (campo)**: cards ordenados por prioridade/proximidade, abas Hoje / Pendentes / Concluídas, concluir em um toque com confirmação.
- **Detalhe da OS**: KM, trecho, foto, observação e botão grande "Concluir".
- **Mapa**: tela cheia; camadas, filtros e resumo em bottom sheet arrastável; botão "Onde estou" que centraliza no trecho mais próximo.
- **Painel (supervisor)**: KPIs em carrossel, prioridades com ação direta, clima e NDVI abaixo.
- **Relatório, Equipes, Notificações, Planejamento**: listas de cards no celular, tabela só em telas grandes.
- **Login**: layout de uma coluna, campos grandes, imagem de fundo reduzida.

## Câmera e GPS

- Foto capturada pela câmera ao registrar/concluir OS, comprimida antes do envio e guardada em bucket de anexos.
- GPS preenche coordenadas e sugere o KM/trecho mais próximo; alternativa manual se o usuário negar a permissão.
- Permissões pedidas só no momento do uso.

## Instalação na tela inicial

- Manifesto, ícones, cor de tema e tags de cabeçalho para "Adicionar à tela de início" (iPhone) e instalação (Android).
- Sem modo offline nesta etapa — o app exige conexão.

## Detalhes técnicos

- Nova `src/components/vegia/MobileTabBar.tsx` montada em `AppLayout` abaixo de `md`; sidebar atual passa a `hidden md:flex` (já é) e o `Sheet` de menu é substituído pela aba "Mais".
- `useIsMobile` + classes base-mobile para alternar tabela ↔ cards em `SegmentTable`, Equipes, Notificações, OrdensServico.
- Bottom sheets com `Sheet`/`Drawer` do shadcn; `Mapa.tsx` reorganizado com overlays empilhados em sheet no celular.
- Fotos: `<input type="file" capture="environment">` + redimensionamento no cliente; bucket de storage com RLS por usuário autenticado.
- GPS: `navigator.geolocation` + `src/lib/km.ts` para converter coordenada em KM/segmento.
- PWA: `public/manifest.webmanifest` + ícones e tags no `index.html`. Sem service worker, sem `vite-plugin-pwa`.
- Colunas novas em `work_orders` para foto e coordenadas do registro, com GRANTs e políticas RLS na mesma migração.
- `padding-bottom` global para a barra inferior e uso de `env(safe-area-inset-bottom)`.
