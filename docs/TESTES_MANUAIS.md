# Testes manuais — Sprint 3

Data da rodada: 26/09/2026. Ambiente: preview local (`http://localhost:8080`), navegador Chromium automatizado.

**Legenda de status:** Passou · Falhou · Não testado.
Um fluxo só é marcado como "Passou" se foi realmente executado. Os fluxos marcados como "Não testado" precisam de uma conta com login e devem ser executados e preenchidos pelo grupo.

---

## Fluxo 1 — Proteção de rotas e login com credenciais inválidas

- **Pré-condições:** usuário sem sessão ativa.
- **Cenário:** alguém sem login tenta abrir o painel e depois entra com email/senha errados.
- **Passos:**
  1. Abrir `/dashboard` sem estar logado.
  2. Na tela de login, digitar `teste-inexistente@example.com` e uma senha qualquer.
  3. Clicar em "Entrar".
- **Resultado esperado:** redirecionar para `/auth`; mostrar a mensagem "Email ou senha incorretos." e continuar fora do painel.
- **Resultado obtido:** redirecionou para `/auth`; apareceu o aviso "Erro — Email ou senha incorretos."; o usuário continuou na tela de login.
- **Status:** **Passou**
- **Evidência:** `docs/evidencias/login-invalido.png`

## Fluxo 2 — Login válido, Dashboard e recuperação de senha

- **Pré-condições:** conta de teste ativa (ver README, seção "Acesso de teste").
- **Passos:**
  1. Em `/auth`, entrar com a conta de teste.
  2. Confirmar o redirecionamento para `/dashboard`.
  3. Conferir os indicadores, o heatmap por km e a lista de trechos prioritários.
  4. Sair, digitar o email em `/auth` e clicar em "Esqueci minha senha".
- **Resultado esperado:** o Dashboard carrega sem erro, com os indicadores preenchidos; a recuperação de senha mostra "Email enviado" e o link abre `/reset-password`.
- **Resultado obtido:** _[preencher]_
- **Status:** **Não testado** (não havia conta de teste compartilhável durante esta rodada)
- **Evidência:** _[preencher]_

## Fluxo 3 — Mapa operacional e detalhe do ponto

- **Pré-condições:** usuário logado.
- **Passos:**
  1. Abrir `/mapa`.
  2. Clicar em um ponto do mapa ou em um card da lista.
  3. Ler o painel lateral.
- **Resultado esperado:** o painel mostra o trecho correto com a altura em cm, o limite contratual, o NDVI e a última roçada; os pontos sem leitura de satélite aparecem como demonstrativos.
- **Resultado obtido:** _[preencher]_
- **Status:** **Não testado**
- **Evidência:** _[preencher]_

## Fluxo 4 — Detalhe do trecho e zona de decisão

- **Pré-condições:** usuário logado.
- **Passos:**
  1. No Dashboard ou no Relatório, clicar em um trecho (`/segmento/:id`).
  2. Ler a "Zona de decisão" e a "Origem dos dados".
- **Resultado esperado:** mostrar altura estimada × limite contratual, a situação (acima ou dentro do limite) e a ação recomendada; indicar "validar em campo" quando a incerteza toca o limite.
- **Resultado obtido:** _[preencher]_
- **Status:** **Não testado**
- **Evidência:** _[preencher]_

## Fluxo 5 — Relatório de conformidade e exportação

- **Pré-condições:** usuário logado.
- **Passos:**
  1. Abrir `/relatorio`.
  2. Aplicar um filtro e mudar a ordenação.
  3. Exportar em CSV, PDF e GeoJSON.
- **Resultado esperado:** a tabela reage ao filtro e à ordenação; os três arquivos são baixados e abrem sem erro.
- **Resultado obtido:** _[preencher]_
- **Status:** **Não testado**
- **Evidência:** _[preencher]_

## Fluxo 6 — Registro de medição de campo (Operador/Administrador)

- **Pré-condições:** usuário com papel `operator` ou `admin`.
- **Passos:**
  1. Abrir `/segmento/:id`.
  2. No formulário de medição de campo, informar a altura, a data da medição, a data da imagem e o tipo de local.
  3. Salvar.
- **Resultado esperado:** a medição é salva e aparece no trecho; o aviso de defasagem aparece quando a imagem é mais de 3 dias anterior à medição; um usuário sem esse papel não consegue salvar.
- **Resultado obtido:** _[preencher]_
- **Status:** **Não testado**
- **Evidência:** _[preencher]_

---

## Testes automatizados (complementares, não substituem os manuais)

`bunx vitest run` cobre os cálculos principais: modelo de altura, índice composto, calibração, incerteza, IRC e busca por km. Veja o resultado da última execução no README.
