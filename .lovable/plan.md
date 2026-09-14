# Simplificação do painel e renovação visual do sistema

## Objetivo
Tornar o painel selecionado e todo o sistema mais simples, apresentável e fácil de entender, sem alterar dados, cálculos, regras contratuais ou integrações existentes.

Direção definida:
- manter a paleta anil atual e suas cores funcionais de atenção, risco e segurança;
- usar Sora nos títulos e Manrope nos textos;
- adotar uma organização compacta, com o essencial primeiro e detalhes técnicos sob demanda;
- preservar os temas claro e escuro e a configuração de densidade já existente.

## 1. Simplificar “Fonte e qualidade do dado”
- Transformar os 11 campos atuais em um resumo imediato com quatro informações: fonte, período analisado, qualidade da leitura e última atualização.
- Traduzir termos técnicos em rótulos claros, mantendo os valores reais vindos da consulta orbital.
- Reunir número de imagens, composição, máscara de nuvens, resolução, buffer e pixels válidos em “Detalhes técnicos”, recolhido por padrão.
- Manter “Ver metodologia completa”, origem estimada/demonstrativa e o aviso de que o satélite não mede altura diretamente.
- Exibir estados ausentes ou demonstrativos de forma clara, sem inventar valores.
- Aplicar a mesma apresentação no dashboard, relatório e demais locais que reutilizam esse painel.

## 2. Consolidar o design system
- Atualizar os tokens globais sem trocar a paleta: superfícies, bordas, contraste, sombras, foco, raios e estados semânticos.
- Definir Sora para títulos e Manrope para corpo, formulários, tabelas e navegação; manter fonte monoespaçada apenas para identificadores e números técnicos.
- Reduzir o raio visual para no máximo 8 px nos controles e cartões, eliminando o excesso de formas arredondadas.
- Criar padrões reutilizáveis para títulos de página, seções, cartões, indicadores, etiquetas de status, campos e áreas vazias.
- Melhorar legibilidade: menos caixa alta, menos espaçamento entre letras, corpo de texto maior e contraste reforçado.
- Padronizar botões e controles no componente visual existente, com alvos de toque adequados, estados de foco, carregamento e desabilitado.

## 3. Organizar a estrutura comum
- Refinar menu lateral e cabeçalho mantendo a navegação atual, o recolhimento do menu e o comportamento móvel.
- Reduzir decoração, gradientes e sombras excessivas; destacar rota ativa, alertas e ação principal com hierarquia consistente.
- Padronizar margens, largura útil e cabeçalhos das páginas.
- Manter o mapa como superfície especializada, sem forçá-lo ao mesmo enquadramento das páginas de formulário e relatório.

## 4. Aplicar o padrão às telas
- Dashboard: reduzir repetições, organizar contexto, situação e indicadores em uma leitura mais curta; manter todas as informações e ações.
- Segmento e Relatório: separar resumo decisório de evidências, cálculos e metodologia; detalhes técnicos ficam progressivos.
- Planejamento, Previsões, Equipes, Ordens, Alertas e Notificações: uniformizar cartões, listas, tabelas, filtros e estados.
- Configurações, Validação e Dataset: uniformizar formulários, grupos, seletores e ações sem alterar regras.
- Login, redefinição e páginas de erro: alinhar tipografia, controles, foco e superfícies ao mesmo padrão.

## 5. Acessibilidade e adaptação
- Garantir um único título principal por tela, hierarquia correta de subtítulos e rótulos compreensíveis.
- Manter foco visível, navegação por teclado, textos alternativos e estados comunicados além da cor.
- Evitar textos menores que o necessário para leitura operacional.
- Validar desktop e celular, sem sobreposição nem rolagem horizontal indevida.
- Respeitar redução de movimento e manter animações somente como feedback funcional.

## 6. Verificação
- Conferir visualmente as rotas principais em desktop e celular, incluindo temas claro e escuro.
- Validar abertura dos detalhes técnicos e da metodologia, menu recolhido/móvel, filtros, formulários, tabelas e ações principais.
- Executar testes existentes e verificação de tipos.
- Confirmar que o projeto encerra sem erros de compilação, execução ou console.

## Detalhes técnicos
Arquivos-base: `src/index.css`, `tailwind.config.ts`, componentes visuais em `src/components/ui`, estrutura em `AppLayout`, `Sidebar` e `TopHeader`, e componentes reutilizáveis de cartões, contexto, origem, decisão e fonte do dado. As páginas serão ajustadas para consumir esses padrões, evitando estilos isolados e preservando toda a lógica atual.
