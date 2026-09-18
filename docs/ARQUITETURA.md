# Arquitetura do VegiaMap

Este documento descreve a organização do código, as rotas, o fluxo de dados e os principais serviços do VegiaMap.

## Visão geral

O VegiaMap é uma Single-Page Application (SPA) em React que se comunica com o Lovable Cloud (Supabase) para:

- autenticação de usuários;
- leitura e escrita dos dados operacionais (trechos, roçadas, ordens de serviço, equipes);
- execução de Edge Functions que buscam dados externos (Google Earth Engine, Open-Meteo, OSRM).

O frontend é responsável por transformar esses dados em visualizações, alertas, relatórios e recomendações de prioridade.

## Estrutura de pastas

```text
src/
├── App.tsx                 # Configuração de rotas, providers e lazy loading
├── main.tsx                # Ponto de entrada React
├── index.css               # Design tokens (variáveis CSS) e Tailwind
├── App.css                 # Estilos globais complementares
├── pages/                  # Telas do aplicativo (uma por rota)
├── components/
│   ├── ui/                 # Componentes base do shadcn/ui
│   └── vegia/              # Componentes de negócio do VegiaMap
├── hooks/                  # Hooks customizados (dados, auth, settings, etc.)
├── lib/                    # Funções puras de cálculo e formatação
├── types/                  # Tipos TypeScript do domínio
├── contexts/               # Providers de estado global (filtros, menu mobile)
└── test/                   # Testes unitários (Vitest)

supabase/
└── functions/              # Edge Functions (Deno/TypeScript)
    ├── _shared/            # Código compartilhado (auth, CORS, GEE, height-model)
    ├── api-health/         # Health check das integrações
    ├── gee-ndvi/           # Busca NDVI/EVI/SAVI no Google Earth Engine
    ├── gee-refresh-segments/ # Atualiza trechos em lote via GEE
    ├── open-meteo-forecast/  # Previsão do tempo para o IRC
    ├── road-route/         # Rota real da rodovia a partir de waypoints OSRM
    ├── point-insight/      # Gera insights pontuais por trecho
    ├── ai-insights/        # Gera insights consolidados (IA)
    ├── vision-detect/      # Detecção visual em imagens (visão computacional)
    └── weather-rodoanel/   # Dados meteorológicos históricos
```

## Rotas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` e `/auth` | `Auth.tsx` | Login (a raiz redireciona para cá) |
| `/reset-password` | `ResetPassword.tsx` | Redefinição de senha |
| `/dashboard` | `Dashboard.tsx` | Painel principal com KPIs e heatmap |
| `/mapa` | `Mapa.tsx` | Mapa operacional com pontos por trecho |
| `/segmento/:id` | `Segmento.tsx` | Detalhes de um trecho específico |
| `/relatorio` | `Relatorio.tsx` | Relatório de conformidade e exportações |
| `/alertas` | `Alertas.tsx` | Lista de alertas |
| `/notificacoes` | `Notificacoes.tsx` | Central de notificações |
| `/previsoes` | `Previsoes.tsx` | Previsões e cenários de crescimento |
| `/planejamento` | `Planejamento.tsx` | Alocação de equipes e priorização |
| `/equipes` | `Equipes.tsx` | Gestão de equipes de campo |
| `/ordens` | `OrdensServico.tsx` | Ordens de serviço de roçada |
| `/prototipo` | `Prototipo.tsx` | Tela de demonstração / protótipo |
| `/dataset` | `Dataset.tsx` | Gerador / visualizador de dados |
| `/configuracoes` | `Configuracoes.tsx` | Configurações gerais e limiares |
| `/analise-cv/:id` | `AnaliseCV.tsx` | Análise visual com bounding boxes |

Todas as rotas internas estão protegidas pelo componente `ProtectedRoute`.

## Gerenciamento de estado

- **React Query (TanStack Query)**: cache e sincronização dos dados vindos do Supabase. Usado nos hooks `useVegiaData.ts`, `useDashboardData.ts`, `useGeeNdvi.ts`, etc.
- **Context API**:
  - `AuthProvider` (`useAuth.tsx`) — sessão do usuário.
  - `SettingsProvider` (`useSettings.tsx`) — configurações de limiares, pesos do IRC, tema.
  - `FiltersContext` — filtros globais de segmentos.
  - `MobileMenuContext` — controle da sidebar em telas pequenas.
- **Estado local (`useState`)**: filtros pontuais de tela, modais, seleções.

## Integrações externas

### Google Earth Engine (GEE)

- Funções `gee-ndvi` e `gee-refresh-segments`.
- Buscam imagens Sentinel-2 SR Harmonized, aplicam máscara de nuvens (banda SCL) e calculam NDVI, EVI e SAVI por trecho.
- Estatística zonal em buffer de ~150 m ao redor do ponto, com mediana e desvio-padrão.
- As leituras são gravadas em `segment_satellite_readings`.

### Open-Meteo

- `open-meteo-forecast` e `weather-rodoanel` fornecem chuva prevista e histórica.
- A chuva acumulada em 5 dias entra no cálculo do IRC.

### OpenStreetMap / OSRM

- `road-route` calcula o traçado real da via a partir de waypoints.
- No frontend, `OSMMap.tsx` exibe o mapa com Leaflet.

### Visão computacional

- `vision-detect` analisa imagens e retorna classe + confiança.
- Usado na tela de análise visual (`/analise-cv/:id`).

## Banco de dados

O banco é PostgreSQL gerenciado pelo Lovable Cloud. As tabelas principais incluem:

- `segments` — trechos da rodovia (km início/fim, tipo, cláusula, limite).
- `segment_satellite_readings` — leituras Sentinel-2 por trecho (NDVI, EVI, SAVI, pixels válidos, incerteza).
- `segment_ndvi_history` — série histórica de vegetação.
- `rocada_events` — datas de roçada por trecho.
- `work_orders` — ordens de serviço geradas pelo sistema.
- `field_teams` — equipes de campo.
- `field_height_measurements` — medições de régua para calibração.
- `alerts` e `notifications` — alertas e central de notificações.
- `audit_log` — registro de ações para rastreabilidade.

Todas as tabelas do schema `public` têm RLS habilitado e grants explícitos para `authenticated` e `service_role`.

## Testes automatizados

A suíte de testes está em `src/test/` e cobre:

- `height-model.test.ts` — paridade entre frontend e backend no cálculo de altura.
- `composite-height.test.ts` — validação do índice composto e da calibração.
- `calibration.test.ts` — lógica de calibração com medições de campo.
- `vegetation-model.test.ts`, `vegetation-metric.test.ts`, `spectral-indices.test.ts` — índices espectrais.
- `irc.test.ts` — Índice de Risco de Crescimento.
- `uncertainty.test.ts` — zona de decisão e incerteza.
- `audit.test.ts`, `km-search.test.ts`, etc.

Comando: `npm run test` ou `bunx vitest run`.

## Segurança

- Autenticação via Supabase Auth (email/senha e OAuth Google).
- Rotas protegidas pelo `ProtectedRoute`.
- RLS em todas as tabelas públicas.
- Funções de banco marcadas como `SECURITY DEFINER` quando precisam escapar do RLS para verificações de papel (`has_role`).
- Nunca armazenamos papel do usuário no `localStorage`; papéis ficam na tabela `user_roles`.

## Performance

- Code splitting por rota com `lazyWithRetry`, que recarrega a página automaticamente se um chunk antigo falhar após deploy.
- Cache de queries com `staleTime` de 60 segundos por padrão.
- Sitemap gerado automaticamente em `predev` e `prebuild`.
