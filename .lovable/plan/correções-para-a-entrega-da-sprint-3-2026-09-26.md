# Correções para a entrega da Sprint 3

Objetivo: atender ao feedback do professor com transparência, sem mudar o funcionamento do app e sem inventar dados.

## Situação verificada

- `.env` está versionado no Git e já aparece no histórico (1 commit). O `.gitignore` não exclui `.env`.
- O `.env` só tem a URL do backend e a chave publicável (pública por natureza, protegida pelas regras de acesso do banco). Não há chave secreta nele, mas o arquivo ainda será tirado do versionamento.
- 26 dos 49 componentes de UI do template não têm nenhuma importação no código: accordion, alert-dialog, alert, aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, radio-group, resizable, sidebar, table, toggle-group.
- Não há documento de testes manuais; o README não tem integrantes, status das funcionalidades nem plano para a Sprint 4.

## O que será feito

1. **`docs/TESTES_MANUAIS.md`** — 6 fluxos reais: login e recuperação de senha, consulta ao Dashboard, Mapa operacional e detalhe do ponto, detalhe do trecho com a zona de decisão, relatório de conformidade com exportação CSV/PDF/GeoJSON, registro de medição de campo (Operador). Cada um terá pré-condições, passos, resultado esperado, resultado obtido, status e evidência.
   - Os fluxos que eu conseguir executar no preview (telas públicas, e telas protegidas se houver sessão disponível) terão status e resultado reais, com captura de tela.
   - O restante fica como **"não testado"**, com o campo "resultado obtido" vazio para o grupo preencher.
2. **README.md** (atualizado, sem apagar o conteúdo atual válido):
   - integrantes com os RMs informados: Luiz Henrique Barbosa Dias (562399), João Victor Alves de Abreu (564946), Rodrigo Kenshin Viana Matayoshi (564026);
   - tabela de funcionalidades com status (concluída / parcial / pendente / não verificada), baseada no código e nos testes;
   - pendências conhecidas (poucos locais de calibração, datas das imagens de satélite ausentes, margem legada de ±13 cm em trechos sem EVI/SAVI, conta de teste) e plano objetivo para a Sprint 4;
   - como entrar no modo demonstração (menu no cabeçalho, depois do login);
   - **usuário de teste:** nenhuma conta de teste compartilhável foi confirmada; o README vai dizer isso e explicar o que o grupo deve criar (conta só de leitura, sem senha pessoal). Não vou inventar credenciais;
   - contribuições: João Victor e Luiz como rascunho marcado **[CONFIRMAR COM O GRUPO]**, Rodrigo como **[CONFIRMAR COM O GRUPO]**; seção honesta sobre o uso do Lovable (a maior parte dos commits foi gerada pela ferramenta a partir dos pedidos do grupo);
   - a decisão Sprint 3 x Challenge do Lovable **não será incluída** até o grupo confirmar os fatos.
3. **`.env`**: adicionar `.env`, `.env.*` e `!.env.example` ao `.gitignore`; criar `.env.example` só com os nomes das variáveis e valores fictícios; tirar o `.env` do rastreamento mantendo o arquivo local.
   - Limitação: o controle do Git é feito pela plataforma e eu não posso rodar comandos como `git rm --cached`. Se o arquivo continuar rastreado, o README e o relatório vão explicar o comando que um integrante deve rodar no próprio clone.
   - Alerta: o arquivo já está no histórico. Como só contém chaves públicas, a troca das chaves é opcional, mas vou registrar que tirar o arquivo agora não apaga o histórico. Não vou reescrever o histórico.
4. **Remover os 26 componentes sem uso**, rodar a busca de novo (alguns deles importavam outros, como toggle) e remover apenas os que ficarem comprovadamente órfãos. Pacotes instalados não serão mexidos, para não arriscar o build.
5. **Validação**: rodar os testes automatizados (hoje são 102), a verificação de tipos e o build. Depois, relatório final com arquivos alterados, o que foi removido e como confirmei, comandos e resultados, e pendências do grupo.

## O que não será feito

- Inventar contribuições, credenciais, resultados de testes ou justificativas.
- Mudar a lógica do app, o modelo de altura ou os textos sobre limitações.
