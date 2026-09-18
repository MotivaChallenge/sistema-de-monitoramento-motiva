# Dados e Origens do VegiaMap

Este documento descreve de onde vêm os dados da plataforma, como são processados e quais são as limitações atuais.

## Fontes de dados

### 1. Sentinel-2 via Google Earth Engine

- **Produto**: `COPERNICUS/S2_SR_HARMONIZED` (Sentinel-2 Surface Reflectance).
- **Processamento**: Google Earth Engine, executado por Edge Functions do Supabase.
- **Filtro de nuvens**: `CLOUDY_PIXEL_PERCENTAGE < 60%` na seleção das cenas; máscara SCL mantendo classes 4, 5, 6, 7 e 11.
- **Composição**: mediana temporal das cenas válidas do período analisado.
- **Resolução nativa**: ~10 m por pixel.
- **Buffer ao redor do ponto**: ~150 m, com estatística zonal (média, mediana, mínimo, máximo, desvio-padrão, pixels válidos).

### 2. Dados operacionais (inseridos pelos usuários)

- **Roçadas**: data em que cada trecho foi cortado (`rocada_events`).
- **Ordens de serviço**: OS geradas pelo sistema (`work_orders`).
- **Equipes**: cadastro de equipes de campo (`field_teams`).
- **Medições de campo**: alturas medidas com régua para calibração (`field_height_measurements`).

### 3. Previsão meteorológica

- **Fonte**: Open-Meteo.
- **Uso**: chuva acumulada em 5 dias, que entra no cálculo do IRC.

### 4. Traçado da rodovia

- **Fonte**: OpenStreetMap + OSRM (`road-route`).
- **Uso**: desenhar o mapa de calor linear e calcular distâncias reais entre trechos.

### 5. Visão computacional

- **Fonte**: modelo de detecção executado na Edge Function `vision-detect`.
- **Uso**: análise visual de imagens de campo, com caixas delimitadoras e confiança.

## Tabelas principais do banco

| Tabela | Finalidade |
|--------|------------|
| `segments` | Trechos da rodovia com km início/fim, tipo, limite contratual e cláusula. |
| `segment_satellite_readings` | Leituras Sentinel-2 por trecho: NDVI, EVI, SAVI, pixels válidos, número de imagens, incerteza. |
| `segment_ndvi_history` | Série histórica de vegetação (5.652 registros, fev/2026 a ago/2026). |
| `rocada_events` | Registro de quando cada trecho foi roçado (942 registros). |
| `field_height_measurements` | Medições de régua para calibração do modelo de altura. |
| `work_orders` | Ordens de serviço de roçada geradas pelo sistema. |
| `field_teams` | Equipes de campo disponíveis para alocação. |
| `alerts` | Alertas automáticos de trechos críticos. |
| `notifications` | Central de notificações do usuário. |
| `audit_log` | Registro de ações para rastreabilidade e auditoria. |
| `user_roles` | Papéis dos usuários (admin, supervisor, operador). |

## Pipeline de satélite

```text
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Sentinel-2     │────▶│  Google Earth Engine │────▶│  Edge Function       │
│  (COPERNICUS)   │     │  (filtro + máscara)  │     │  gee-ndvi /          │
└─────────────────┘     └─────────────────────┘     │  gee-refresh-segments │
                                                    └─────────────────────┘
                                                               │
                                                               ▼
                                                    ┌─────────────────────┐
                                                    │  Supabase / Postgres │
                                                    │  segment_satellite   │
                                                    │  _readings           │
                                                    └─────────────────────┘
                                                               │
                                                               ▼
                                                    ┌─────────────────────┐
                                                    │  Frontend React      │
                                                    │  cálculo de altura   │
                                                    │  e decisão           │
                                                    └─────────────────────┘
```

## Origem do dado na interface

Cada trecho exibe uma etiqueta de origem:

| Origem | Significado |
|--------|-------------|
| **Medido em campo** | Medição presencial registrada. Vale como evidência contratual. |
| **Estimado por satélite + modelo** | Derivado de NDVI/EVI/SAVI pelo modelo calibrado. Não é medição direta. |
| **Detectado por visão computacional** | Detecção automática em imagem. Sujeita a falso positivo. |
| **Validado em campo** | Estimativa remota confirmada presencialmente. |
| **Demonstrativo** | Dado de demonstração/protótipo. Não representa medição real. |

## Limitações e próximos passos

1. **Calibração insuficiente**: apenas 2 locais medidos. Para uma validação robusta, são necessários 8 a 10 locais, com pelo menos 5 réguas cada.
2. **Defasagem temporal**: as datas das imagens Sentinel-2 dos pontos de calibração ainda não foram vinculadas. A diferença entre a data da imagem e a data da medição pode aumentar o erro aparente.
3. **Datas de imagem ausentes**: o sistema ainda não exibe automaticamente a data exata da cena Sentinel usada em cada leitura.
4. **Resolução espacial**: o pixel de 10 m pode conter mistura de vegetação, asfalto, barranco e sombra. A estatística zonal ajuda, mas não elimina a heterogeneidade.
5. **Modelo por ambiente**: ainda não há evidência para separar modelos por rotatória, canteiro, sítio, etc.

## Recomendação de calibração

Para reduzir a incerteza de forma defensável:

- **8 a 10 locais** ao longo do Rodoanel.
- **5 réguas por local**, bem distribuídas no trecho.
- **Imagem Sentinel-2 a no máximo 3 dias** da medição de campo.
- **Cobrir faixas de altura** de ~5 cm a ~60 cm.

Total estimado: **cerca de 50 medições pareadas**.
