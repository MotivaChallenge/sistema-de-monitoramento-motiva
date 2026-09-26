# Sprint 4 — Versão Final, APK e Plano de Negócio

## Objetivo
Entregar a versão final da plataforma VegiaMap: APK Android instalável (via Capacitor), plano de negócio contextualizado para a Motiva, README consolidado das 4 sprints e suporte ao vídeo de pitch. Nada quebra o que já funciona (102 testes, build OK).

## 1. Correções pendentes da Sprint 3
- Revisar `docs/TESTES_MANUAIS.md`: executar os fluxos 2 a 6 que ficaram pendentes por falta de conta de teste e registrar os resultados reais.
- Verificar os alertas de segurança restantes do scan (10 não selecionados) e reportar ao grupo — sem corrigir nada além do que o grupo aprovar.
- Confirmar com o grupo: nomes completos, RMs e contribuições no README (valores atuais marcados como "a confirmar" — não serão fabricados).

## 2. APK Android via Capacitor
- Instalar `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.
- `npx cap init` com appId `app.lovable.p070ca8a99f494040a84b3259ebce1a4a` e appName `sistema-de-monitoramento-motiva`, incluindo o bloco `server.url` de hot-reload do sandbox.
- Validar que o app web continua idêntico no navegador (Capacitor não altera o código web).
- Documentar no README o passo a passo do build do APK: exportar para GitHub → `npm install` → `npx cap add android` → `npm run build` → `npx cap sync` → build no Android Studio → publicar o APK em **GitHub Releases** e colar o link no README.
- O build final do APK roda na máquina do grupo (precisa de Android Studio); eu deixo tudo configurado e as instruções prontas. Link do Release fica marcado como pendente até o grupo subir o arquivo.

## 3. Plano de negócio (PDF em Arquivos)
Documento em português, realista e contextualizado no problema da Motiva (não genérico), gerado em PDF com a identidade do projeto:
- **Proposta de valor**: monitoramento de vegetação por satélite no Rodoanel SP-021, decisão contra o limite contratual de 30 cm, redução de risco de multa ARTESP e de roçadas desnecessárias.
- **Personas e público-alvo**: gestor de contrato Motiva, equipe de campo/roçada, auditoria/ARTESP — baseados nos 3 perfis reais da plataforma (Consulta, Operador, Administrador).
- **Modelo de receita**: serviço gerenciado por assinatura anual por km monitorado (com justificativa e alternativa de licença).
- **Custos operacionais estimados**: infraestrutura (backend, GEE, hospedagem), equipe mínima, campanhas de calibração em campo — com valores claramente marcados como estimativas.
- **Riscos**: defasagem temporal imagem×medição, 2 locais de calibração (prova de conceito), variabilidade natural do capim (~6 cm), dependência de cobertura Sentinel-2.
- **Diferenciais**: transparência de origem do dado, margem de erro declarada (±2,9 cm na média do trecho), auditoria ponta a ponta — nenhum número inventado.
- Entrega em `/mnt/documents/plano-de-negocio-vegiamap.pdf`, com QA visual página a página.

## 4. README final consolidado
Reescrever o `README.md` como documento-âncora:
- Proposta da solução e problema da Motiva.
- Stack utilizada.
- **Link do APK** (GitHub Releases — pendente até o grupo subir) e **link do vídeo final** (pendente).
- Resumo das entregas por Sprint (1 a 4).
- Instruções de instalação do APK e de build.
- Seção de equipe com nomes/RMs/contribuições — somente após confirmação do grupo.
- Links para `docs/` (ARQUITETURA, MATEMATICA, DADOS, ROADMAP, TESTES_MANUAIS) e para o plano de negócio.

## 5. Vídeo de pitch (apoio, sem gravação)
- A gravação é do grupo (narração por IA não é aceita). Entrego um **roteiro de até 5 minutos** em `docs/ROTEIRO_PITCH.md`: apresentação do grupo → problema → demonstração do app instalado no dispositivo → plano de negócio resumido → impacto para a Motiva, com tempos sugeridos por bloco e o que mostrar em tela em cada momento.

## Fora de escopo
- Não gero o arquivo APK binário aqui (requer Android Studio na máquina do grupo).
- Não gravo nem narro o vídeo.
- Não invento nomes, RMs, links, custos "oficiais" ou resultados de testes.

## Verificação
- `bunx tsgo --noEmit`, `bunx vitest run` (102 testes) e build web OK após a configuração do Capacitor.
- QA visual do PDF do plano de negócio página a página.
- Conferência de que o README não contém placeholders sem marcação de pendência.
