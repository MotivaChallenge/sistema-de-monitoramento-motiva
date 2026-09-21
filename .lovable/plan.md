# User Flow da Plataforma — Challenge Motiva

## Entrega
Criar um único arquivo PDF para a **Equipe 5**, sem modificar a plataforma ou seus arquivos. O documento será preparado para entrega acadêmica da CP-2 de Engenharia de Software.

## Estrutura visual
- Um fluxograma único, amplo e legível, em página horizontal de alta resolução.
- Organização por raias para distinguir claramente os três perfis reais da solução:
  - **Usuário de consulta** — acompanha indicadores, mapa, alertas, relatórios e notificações;
  - **Operador** — também registra ações de campo, medições, roçadas e administra ordens de serviço;
  - **Administrador** — também configura limites e pesos, gerencia equipes e controla a calibração.
- Uma faixa comum para acesso, validação de credenciais, recuperação de senha, Dashboard e encerramento.
- Identidade visual coerente com a Motiva e aparência inspirada no exemplo enviado, sem copiar o conteúdo ilustrativo.
- Legenda com os símbolos exigidos: início/fim, processo/ação, decisão, entrada/saída e setas.

## Conteúdo do fluxo
1. **Acesso comum**
   - Início → acessar plataforma → informar e-mail e senha → sistema valida credenciais.
   - Credenciais inválidas → mensagem de erro → tentar novamente ou recuperar senha.
   - Credenciais válidas → Dashboard → identificação do perfil.

2. **Usuário de consulta**
   - Consultar indicadores → abrir mapa operacional → selecionar ponto/trecho.
   - Sistema apresenta altura em centímetros, limite contratual, leitura de satélite e situação.
   - Decisão sobre necessidade de aprofundamento → detalhes, alertas, previsões, notificações ou relatório.
   - Exportar/consultar informação → retornar ao Dashboard ou encerrar sessão.

3. **Operador**
   - Todas as consultas do perfil anterior.
   - Escolher intervenção → criar/editar/concluir ordem de serviço ou registrar ação no trecho.
   - Inserir medição, observação ou roçada → sistema valida e grava → dados e situação são atualizados.
   - Resolver alerta quando aplicável → acompanhar resultado → retornar ao Dashboard ou encerrar sessão.

4. **Administrador**
   - Todas as ações de consulta e operação.
   - Gerenciar equipes e planejamento.
   - Abrir configurações → alterar limites/pesos → sistema valida os valores.
   - Valores inválidos → corrigir; valores válidos → salvar e recalcular informações.
   - Verificar se existem medições suficientes para calibração → recalibrar quando permitido ou manter o modelo atual.
   - Revisar resultado/auditoria → retornar ao Dashboard ou encerrar sessão.

## Fidelidade ao sistema
O fluxo será baseado nas rotas e permissões atuais da plataforma, incluindo os caminhos alternativos reais: falha de login, recuperação de senha, acesso somente leitura, validação de configurações e calibração condicionada à quantidade mínima de medições.

## Validação da entrega
- Conferir se todos os critérios da atividade aparecem no diagrama.
- Renderizar o PDF em imagem e revisar integralmente: legibilidade, setas, cruzamentos, textos cortados, contraste e identificação dos perfis.
- Corrigir qualquer problema visual antes da entrega.
- Entregar somente o PDF final em Arquivos; nenhum conteúdo será implementado no projeto.
