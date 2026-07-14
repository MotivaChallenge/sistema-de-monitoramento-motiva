
# Cadastro das rodovias Motiva no Mapa Operacional

Hoje o sistema só tem uma rodovia: **SP-021 (Rodoanel Oeste)**, com 30 marcadores de km em `km_markers`. `segments` não tem coluna de rodovia. Precisamos suportar as 8 concessões Motiva (~20 rodovias) e deixá-las selecionáveis no mapa.

## 1. Modelo de dados (migration)

- Nova tabela `public.highways`:
  - `code` (ex: `SP-348`, `BR-116-DUTRA`) — PK
  - `nome` (ex: "Rodovia dos Bandeirantes")
  - `concessao` (ex: "Motiva Autoban")
  - `uf_inicio`, `uf_fim`
  - `km_inicio`, `km_fim` (numeric)
  - `start_lat`, `start_lng`, `end_lat`, `end_lng`
  - `cor` (token semântico p/ legenda, ex: `primary`, `tertiary`, `turquoise`…)
- Alterar `km_markers`:
  - `rodovia` já existe (text). Adicionar FK → `highways.code` (com `ON DELETE CASCADE`).
- Alterar `segments`:
  - Adicionar `rodovia text` FK → `highways.code` (nullable, default `'SP-021'` para as linhas atuais).
- GRANTs + RLS: leitura pública em `highways`; escrita só `admin`/`operator` (mesmo padrão de `segments`).

## 2. Seed das concessões

Inserir as 20 rodovias descritas pelo usuário no `INSERT` inicial. Cobertura por concessão:

- **RioSP**: BR-116 Dutra (km 230,6 SP → 163,0 RJ), BR-101 Rio-Santos (km 52,1 → 380,8).
- **Autoban**: SP-348 Bandeirantes (13→173), SP-330 Anhanguera (11→158,5), SP-300 (62→101,1), SP-360 (61,9→81,1).
- **Minas_SP**: BR-381 Fernão Dias (0→562,1).
- **Sorocabana**: SP-270 Raposo (34→115,5), SP-075 Castelinho (0→15,1), SP-280 Marginais Castello.
- **SPVias**: SP-280 Castello (129,6→315), SP-270 Raposo (168,2→295,4), SP-127 (105,9→213,1), SP-255 (237,7→288,1), SP-258 (222,8→342,4).
- **ViaSul**: BR-101 RS (0→89,7), BR-290 Freeway (0→96,6), BR-386 (0→444,5), BR-448 (0→22,3).
- **ViaCosteira**: BR-101 SC (244,6→465,1).
- **RodoAnel**: SP-021 (0→29,3) — já existe.

Lat/lng dos endpoints preenchidos a partir das cidades citadas (São Paulo, Rio, Ubatuba, Torres, Osório, Palhoça, Belo Horizonte etc.). Serão coordenadas aproximadas das cidades-âncora.

## 3. Marcadores de km sintéticos

Como não temos geometria real das rodovias, gerar `km_markers` por interpolação linear entre `start` e `end` de cada rodovia, um marcador a cada N km (configurável, N=5 para rodovias longas, N=1 p/ curtas). Assim o mapa desenha uma polyline reta representativa e a lista lateral funciona.

Isto será **explicitamente sinalizado** no card da concessão como "traçado aproximado — georreferência real virá de dados oficiais". Nada de alegar geometria real quando é reta.

## 4. Filtro por concessão/rodovia no Mapa Operacional

- Novo overlay no topo (ou dentro do painel "Camadas"): dropdown "Concessão" + dropdown "Rodovia".
- Ao selecionar, `Mapa.tsx` filtra `km_markers` e (opcionalmente) `segments` daquela rodovia e chama `fitBounds`.
- Adicionar `useHighways()` em `useVegiaData.ts`.
- `useKmMarkers(rodovia?)` aceita filtro opcional por rodovia.
- Card "Resumo da malha" passa a mostrar nome da rodovia + concessão selecionada.

## 5. `GlobalFilters` (opcional, cross-page)

- Adicionar filtro global "Concessão" no `FiltersContext` para propagar Dashboard/Planejamento/Previsões. Se preferir escopo menor, deixamos apenas no Mapa nesta primeira leva.

## Fora do escopo

- Importar geometria real (KML/GeoJSON DNIT/Arteris) — grande, requer dados externos. Fica anotado como próximo passo.
- Segmentar automaticamente cada rodovia em trechos com IRC/altura/NDVI reais. Manteremos os segmentos atuais no SP-021 e deixaremos as demais rodovias "sem segmentos" até que sejam cadastrados/importados.
- Alterar Dashboard/Planejamento para consolidar por concessão (dependeria do item anterior).

## Ordem de execução

1. `supabase--migration`: criar `highways`, colunas novas em `km_markers` e `segments`, RLS, GRANT.
2. `supabase--insert`: seed `highways` (20 linhas) + `km_markers` interpolados.
3. `useVegiaData.ts`: `useHighways`, ampliar `useKmMarkers(rodovia?)`.
4. `Mapa.tsx`: seletor de concessão/rodovia, refazer filtragem.
5. Ajustar `Sidebar`/`TopHeader` se necessário para mostrar rodovia ativa.
6. Verificar build.

## Confirmar antes de implementar

- Coordenadas de endpoints ficarão como aproximação de cidade (sem geometria real). OK?
- Escopo do filtro: só no Mapa (rápido) ou global via `FiltersContext` (mais trabalho)?
