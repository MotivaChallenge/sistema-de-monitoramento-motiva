## Objetivo

Aumentar densidade e realismo dos dados operacionais no mapa, cobrindo todas as 20 rodovias das 8 concessões Motiva com segmentos, marcos KM e traçados refinados.

## Escopo por rodovia

Para cada uma das 20 rodovias (incluindo Rodoanel SP-021):

- **Segmentos**: passar de ~5 para **15–20 segmentos** distribuídos ao longo da extensão (kmStart/kmEnd interpolados entre `km_inicio` e `km_fim`)
- **km_markers**: gerar marcos a cada **5 km** com lat/lng interpolados no traçado
- **Waypoints**: adicionar 4–8 pontos intermediários adicionais em cada rodovia (hoje 2–3), para o OSRM produzir curvas mais fiéis à pista antes do snapping

## Perfil por concessão (balanceado)

Cada concessão recebe uma "personalidade" operacional distinta:

| Concessão | Perfil | Distribuição aproximada |
|---|---|---|
| Motiva RioSP (Dutra, Rio-Santos) | Alta densidade urbana, mais crítico | 50% conforme / 30% atenção / 20% crítico |
| Motiva SPVias | Interior estável | 75% conforme / 20% atenção / 5% crítico |
| Motiva AutoBAn (Bandeirantes/Anhanguera) | Referência operacional | 80% conforme / 15% atenção / 5% crítico |
| Motiva Litoral Sul (Imigrantes/Anchieta) | Mata Atlântica, crescimento rápido | 45% conforme / 35% atenção / 20% crítico |
| Motiva Centrovias | Padrão | 65% conforme / 25% atenção / 10% crítico |
| Motiva Intervias | Rural moderado | 70% conforme / 22% atenção / 8% crítico |
| Motiva ViaOeste (Castello/Raposo) | Metropolitano | 60% conforme / 28% atenção / 12% crítico |
| Rodoanel (SP-021) | Preserva reais + expande faixas ainda não cobertas | mantém reais, adiciona ~10 novos |

Cada segmento recebe: `tipo` (Gramínea/Arbusto/Trepadeira/Palha), `ndvi` coerente com status, `altura` vs `limite`, `clausula` (5.2.1, 5.2.3, 6.1.2, etc.), `ultima_rocada`, `deadline` (quando crítico).

## Dados relacionados

- **rocada_classification**: gerar 40–60 polígonos mockados distribuídos pelas concessões (classes: "Realizada", "Programada", "Atrasada")
- **segment_ndvi_history**: 7 pontos históricos para cada novo segmento crítico/atenção (para o gráfico de tendência funcionar)

## Entregáveis técnicos

1. **Migração de dados** (`supabase--insert`) em blocos por concessão:
   - INSERT em `highways` (atualização de waypoints via coluna dedicada, se existir — senão apenas re-seed dos segments/markers)
   - INSERT em `segments` (novos ~300 registros no total)
   - INSERT em `km_markers` (~800 marcos, a cada 5 km)
   - INSERT em `segment_ndvi_history` (~500 pontos)
   - INSERT em `rocada_classification` (~50 polígonos)

2. **Ajuste de waypoints intermediários** em `src/pages/Mapa.tsx` (ou hook que constrói o input do OSRM): adicionar pontos por rodovia para melhorar o traçado quando OSRM cai em fallback.

3. **Sem mudança de schema** — apenas dados. Sem mudanças de UI além dos waypoints.

## Preservação

- Dados reais do Rodoanel (SP-021) permanecem intactos; novos apenas complementam faixas ainda não cobertas.
- Estruturas de tabela e RLS não mudam.
- IDs gerados com prefixo por rodovia para facilitar rollback (`seed-{code}-{n}`).

## Validação pós-execução

- `SELECT rodovia, COUNT(*) FROM segments GROUP BY rodovia` → todas com 15–20
- Visualizar cada concessão no `/mapa` e confirmar pontos ao longo do traçado
- Confirmar que filtro por concessão/rodovia continua funcionando
