# Documentação completa para o README do GitHub

Substituir o README.md desatualizado por uma documentação pública clara, com README enxuto + pasta `docs/`, sem modificar a aplicação em si.

## O que será entregue

1. **README.md** novo, em português, voltado para visitantes do repositório:
   - título e descrição do produto (VegiaMap / Monitoramento de Vegetação Rodoviária);
   - problema resolvido (conformidade com altura de vegetação na faixa de domínio do Rodoanel SP-021, risco de multa ARTESP);
   - link para a aplicação publicada;
   - screenshot do dashboard (gerado a partir do preview atual);
   - principais funcionalidades em lista curta;
   - tecnologias (React, Vite, TypeScript, Tailwind, Supabase, Google Earth Engine);
   - como rodar localmente (clone, instalação, dev, build, testes);
   - links para os documentos técnicos dentro de `docs/`;
   - licença / aviso sobre dados demonstrativos.

2. **docs/ARQUITETURA.md** — estrutura do projeto, rotas, fluxo de dados, principais hooks e serviços.

3. **docs/MATEMATICA.md** — explicação simples e depois as fórmulas do modelo de altura (índice composto V, reta H = 163,4·V − 28,2), incerteza medida (MAE 1,0 cm, pior caso 2,9 cm), variabilidade natural do capim (~6 cm), regra de decisão contra o limite de 30 cm, e o que foi tentado e descartado (Gompertz, termo temporal, Beer-Lambert, troca de pesos).

4. **docs/DADOS.md** — origem dos dados (Sentinel-2, GEE, Open-Meteo, OSRM/road-route), tabelas do banco, limitações declaradas e próximos passos de calibração.

5. **docs/ROADMAP.md** — resumo das fases do projeto do protótipo até a versão atual, incluindo o que foi descartado e por quê.

## O que NÃO será alterado

- Nenhum arquivo da aplicação (`src/`, `supabase/`, `index.html`, `package.json`, etc.).
- Nenhuma configuração de build ou deploy.
- Nenhum dado do banco.

## Critérios de qualidade

- README não pode repetir informação desatualizada (por exemplo, dizer que os dados são mocks, que usa Inter, ou que são apenas 4 páginas).
- README deve ser escaneável: título, badges, screenshot, funcionalidades, link, setup.
- Docs devem ser técnicas, mas legíveis para público geral com interesse no projeto.
- Todas as fórmulas e números devem bater com o código atual (`src/lib/height-model.ts`, `src/lib/composite-height.ts`, `src/lib/vegetation-model.ts`, `src/lib/irc.ts`).
- Nenhuma afirmação de precisão além do que os dados sustentam (erro de ±2,9 cm vale só para a média do trecho com calibração; ponto isolado ainda tem variação natural do capim).

## Como será produzido

1. Leitura dos arquivos-chave para confirmar números e arquitetura (`src/lib/*.ts`, `supabase/functions/_shared/*.ts`, `src/App.tsx`, estrutura de pastas).
2. Geração do screenshot do dashboard via Playwright.
3. Escrita do README.md e dos arquivos em `docs/`.
4. Conferência final: links internos funcionam, nenhuma mentira sobre precisão, build continua passando.
