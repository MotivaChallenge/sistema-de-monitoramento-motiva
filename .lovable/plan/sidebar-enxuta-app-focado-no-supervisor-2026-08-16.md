# Sidebar enxuta + app focado no supervisor

## Problema

A sidebar hoje tem 10 itens no mesmo nível (Dashboard, Mapa, Previsões, Planejamento, Equipes, Ordens, Testes do Protótipo, Gerador de Dataset, Relatórios, Configurações). Ferramentas técnicas (Protótipo, Dataset) disputam espaço com o fluxo diário de operação.

## Nova estrutura da navegação

Três blocos com rótulo, itens secundários agrupados em subseções recolhíveis:

```text
OPERAÇÃO
  Dashboard            (badge de alertas)
  Mapa Operacional
  Ordens de Serviço

PLANEJAMENTO
  Planejamento         -> subitens: Previsões, Equipes
  Relatórios

FERRAMENTAS  (recolhido por padrão)
  Testes do Protótipo
  Gerador de Dataset

rodapé: Configurações + usuário
```

- Grupo com a rota ativa abre automaticamente; estado de abertura persistido em localStorage.
- No modo recolhido (ícones), os grupos viram apenas ícones com tooltip — nada some.
- Nenhuma rota é removida; Previsões e Equipes continuam acessíveis em `/previsoes` e `/equipes`, agora aninhadas visualmente sob Planejamento.

## Deixar mais funcional para o supervisor

1. **Cabeçalho de trabalho fixo**: no topo de cada tela, a rodovia selecionada, data e um resumo curto (críticos / alertas / ordens abertas), com o mesmo filtro global valendo para todas as páginas.
2. **Dashboard como painel de turno**: ordem clara — alertas críticos e prioridades primeiro, clima e NDVI depois. Cada item de prioridade com ação direta ("Abrir OS", "Ver no mapa").
3. **Ações rápidas na sidebar**: botão destacado "Nova ordem de serviço" acima da navegação, disponível em qualquer tela.
4. **Ordens de Serviço**: filtros rápidos por status (Pendentes / Em execução / Concluídas) em abas, e contador de pendentes como badge no item da sidebar.
5. **Página de Planejamento** ganha atalhos internos para Previsões e Equipes, reforçando o agrupamento.

## Estética

- Mantém a paleta anil/neutros e o gradiente atual da sidebar; rótulos de grupo em caixa alta, tracking largo, cor esmaecida.
- Separadores sutis entre blocos, animação de expansão suave (mesma curva das transições existentes), indicador ativo com barra à esquerda já usado hoje.
- Densidade menor: itens principais com peso maior, subitens levemente indentados e em tamanho reduzido.

## Detalhes técnicos

- `src/components/vegia/Sidebar.tsx`: substituir a lista plana por uma estrutura de grupos (`{ label, items[], defaultCollapsed }`), com `Collapsible` do shadcn para as subseções e tooltips no modo `collapsed`.
- Badges: reaproveitar `useActiveAlertsCount` para Dashboard e adicionar contagem de ordens pendentes via `useWorkOrders`.
- Botão "Nova OS" abre o formulário existente de `OrdensServico` extraído para um dialog reutilizável.
- Abas de status em `src/pages/OrdensServico.tsx` usando o componente `Tabs` já disponível.
- Sem mudança de rotas em `src/App.tsx` e sem alteração de banco de dados.
