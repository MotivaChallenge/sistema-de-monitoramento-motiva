# VegiaMap — Monitoramento de Vegetação Rodoviária
---

## Integrantes

| Nome | RM |
|------|----|
| Luiz Henrique Barbosa Dias | 562399 |
| João Victor Alves de Abreu | 564946 |
| Rodrigo Kenshin Viana Matayoshi | 564026 |

---

## O que é

O **VegiaMap** é uma aplicação web desenvolvida para a **Motiva / Rodoanel SP-021** que transforma imagens de satélite e dados operacionais em informação acionável para equipes de campo.

Em vez de depender de inspeções manuais em toda a extensão da rodovia, o sistema cruza:

- **Imagens Sentinel-2** processadas no Google Earth Engine (NDVI, EVI, SAVI);
- **Previsão meteorológica** (Open-Meteo) para antecipar aceleração do crescimento;
- **Histórico de roçadas** para saber onde a vegetação está crescendo há mais tempo;
- **Medições de campo** (régua) para calibrar o modelo e não fingir precisão.

O resultado é um painel onde o supervisor vê, em uma tela só, os trechos críticos, o mapa de calor ao longo dos quilômetros, a altura estimada em centímetros e a recomendação de ação.

---

## Funcionalidades principais

- **Dashboard operacional** com KPIs de cobertura, trechos críticos, NDVI médio e conformidade estimada.
- **Mapa interativo** com pontos por quilômetro, altura estimada e origem do dado (satélite, campo, demonstrativo).
- **Heatmap linear** do traçado da rodovia com segmentos coloridos por criticidade.
- **Detalhamento por trecho** (`/segmento/:id`): altura, limite contratual, histórico de NDVI, última roçada e recomendação de ação.
- **Relatório de conformidade** com filtros, ordenação e exportação para PDF/CSV/GeoJSON.
- **Planejamento e priorização** com Índice de Risco de Crescimento (IRC) e alocação sugerida de equipes.
- **Alertas e notificações** centralizados para acompanhamento de prazos.
- **Modo demonstração** para apresentações sem depender de leituras de satélite.
- **Tema claro/escuro** e interface responsiva para uso em tablets e celulares.

---

## Demonstração ao vivo

🌐 **Aplicação publicada**: [https://sistema-de-monitoramento-motiva.lovable.app](https://sistema-de-monitoramento-motiva.lovable.app)

> O acesso às rotas protegidas exige autenticação. A raiz (`/`) redireciona para a tela de login.

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| Estilos | Tailwind CSS 3 + shadcn/ui + Radix |
| Roteamento | React Router 6 |
| Estado | React Query (TanStack Query), Context API |
| Backend / Banco | Lovable Cloud (Supabase): Postgres, Auth, Edge Functions |
| Dados externos | Google Earth Engine, Open-Meteo, OpenStreetMap / OSRM |
| Testes | Vitest + Testing Library |
| Build/deploy | Vite → Lovable Cloud |

---

## Rodando localmente

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd <nome-do-repositorio>

# 2. Instale as dependências
npm install
# ou
bun install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:8080`.

### Outros comandos úteis

```bash
npm run build       # build de produção
npm run test        # executa todos os testes (Vitest)
npm run lint        # lint do projeto
```

---

## Documentação

A documentação técnica completa está na pasta [`docs/`](./docs):

- [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md) — estrutura do projeto, rotas, fluxo de dados e integrações.
- [`docs/MATEMATICA.md`](./docs/MATEMATICA.md) — como a estimativa de altura funciona, fórmulas e limitações.
- [`docs/DADOS.md`](./docs/DADOS.md) — fontes de dados, tabelas e pipeline de satélite.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — evolução do projeto, fase por fase, incluindo o que foi descartado e por quê.

- [`docs/TESTES_MANUAIS.md`](./docs/TESTES_MANUAIS.md) — os 6 fluxos principais, com cenário, resultado esperado, resultado obtido e status.

---

## Acesso de teste

**Ainda não existe uma conta de teste compartilhável.** Nenhuma credencial é publicada aqui.
O que o grupo precisa fazer:
1. Criar um usuário exclusivo para avaliação (por exemplo, `avaliacao@<domínio-do-grupo>`), com senha que não seja pessoal.
2. Não atribuir papel `admin` a ele (acesso só de consulta).
3. Enviar as credenciais ao professor por um canal privado, ou colocá-las nesta seção se o grupo decidir que isso é seguro.

`[CONFIRMAR COM O GRUPO]`

## Modo demonstração

Depois do login, use o menu de modo demonstração no cabeçalho do painel. Ele permite apresentar o sistema sem depender de leituras de satélite. Os dados desse modo aparecem marcados como "demonstrativo".

---

## Status das funcionalidades

| Funcionalidade | Status | Evidência |
|---|---|---|
| Login, proteção de rotas e recuperação de senha | Parcial | Proteção e login inválido testados à mão (Fluxo 1); login válido e recuperação de senha não testados |
| Dashboard (indicadores, heatmap, prioridades) | Não verificada | Código existe; teste manual pendente (Fluxo 2) |
| Mapa operacional com altura por ponto | Não verificada | Código existe; Fluxo 3 pendente |
| Detalhe do trecho e zona de decisão | Não verificada | Fluxo 4 pendente |
| Relatório com exportação CSV/PDF/GeoJSON | Não verificada | Fluxo 5 pendente |
| Medição de campo (Operador/Admin) | Não verificada | Fluxo 6 pendente |
| Modelo de altura (NDVI/EVI/SAVI) | Parcial | Coberto por testes automatizados; calibrado com só 2 locais (prova de conceito) |
| IRC / priorização | Concluída (cálculo) | `src/test/irc.test.ts` |
| Previsões, Planejamento, Equipes, Ordens de serviço | Não verificada | Telas existem; sem teste manual |
| Modo demonstração | Não verificada | Fluxo manual ainda não registrado |

## Pendências conhecidas

- Conta de teste para avaliação ainda não foi criada.
- Os fluxos 2 a 6 dos testes manuais ainda precisam ser executados e preenchidos.
- A calibração usa só 2 locais; as datas das imagens Sentinel desses pontos não são conhecidas.
- Trechos sem EVI/SAVI continuam com a margem antiga de ±13 cm.
- As contribuições individuais precisam ser confirmadas pelo grupo.

## Plano para a Sprint 4

1. Criar a conta de avaliação e executar os 6 fluxos manuais, com capturas de tela.
2. Fazer a campanha de calibração: 8 a 10 locais, 5 réguas cada, imagem Sentinel a no máximo 3 dias da medição.
3. Registrar as medições no banco (hoje estão só no código) e recalibrar.
4. Fazer commits individuais de cada integrante, com mensagens descritivas.

---

## Contribuições e uso de ferramentas

| Integrante | Contribuição |
|---|---|
| João Victor Alves de Abreu | Estrutura lógica e escolha das tecnologias `[CONFIRMAR COM O GRUPO]` |
| Luiz Henrique Barbosa Dias | Design do front-end e escolhas visuais `[CONFIRMAR COM O GRUPO]` |
| Rodrigo Kenshin Viana Matayoshi | `[CONFIRMAR COM O GRUPO]` |

**Uso do Lovable:** a maior parte do código foi gerada pela ferramenta Lovable (IA) a partir dos pedidos, revisões e medições de campo do grupo. Por isso o histórico tem cerca de 790 commits automáticos (`gpt-engineer-app[bot]`) e apenas 1 commit de um integrante. Esse histórico não mostra, por si só, a divisão de trabalho, e por isso a tabela acima precisa da confirmação do grupo.

---

## Avisos importantes

- **O satélite não mede altura diretamente.** A altura mostrada é uma estimativa produzida por modelo e deve ser confirmada em campo quando estiver próxima do limite contratual.
- **A margem de ±2,9 cm** foi medida por validação cruzada nos 2 locais calibrados, contra a **média do trecho**, usando composição de ~12 imagens Sentinel-2. Não é uma precisão garantida para qualquer ponto isolado.
- **O modelo ainda é prova de conceito** enquanto não houver 8 a 10 locais calibrados com pelo menos 5 réguas cada e imagens Sentinel-2 a no máximo 3 dias da medição de campo.
- **Decisão contratual**: o sistema indica "validar em campo" sempre que a faixa de incerteza toca ou cruza o limite aplicável (30 cm, 45 cm ou 60 cm, conforme a cláusula do ativo).

---

## Licença

Este projeto foi desenvolvido como entrega para a **Motiva / Rodoanel SP-021**. O código-fonte é de propriedade do cliente, salvo bibliotecas de terceiros sob suas respectivas licenças.

---
