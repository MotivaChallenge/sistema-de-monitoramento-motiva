# Design system da plataforma

## Objetivo
Atualizar a linguagem visual da plataforma inteira sem alterar regras, dados, rotas ou fluxos existentes.

## Etapas
1. Definir com o usuário a paleta, a tipografia e a estrutura visual desejadas.
2. Criar três direções visuais aplicadas ao painel atual, preservando essas escolhas.
3. Implementar a direção escolhida nos tokens globais e nos elementos compartilhados.
4. Harmonizar navegação, cabeçalhos, cartões, tabelas, formulários, estados e gráficos.
5. Validar temas claro/escuro, densidade compacta, teclado, contraste, mobile e desktop.
6. Executar testes, conferir as rotas principais e corrigir qualquer regressão visual ou funcional.

## Preservado
- Integrações, cálculos, permissões e conteúdo.
- Rotas e fluxos operacionais.
- Identidade Motiva e significados de sucesso, atenção e criticidade.

## Detalhes técnicos
- Consolidar cores, raios, sombras, tipografia, espaçamentos e movimento em tokens semânticos.
- Remover inconsistências como raios excessivos, estilos duplicados e controles HTML fora do padrão visual.
- Não alterar banco de dados nem lógica de negócio.
