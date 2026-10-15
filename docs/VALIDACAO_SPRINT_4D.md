# Validação da Sprint 4D

Data: 11/10/2026. Base: repositório `MotivaChallenge/sistema-de-monitoramento-motiva`, branch `main` em `335e181` mais as correções desta Sprint 4D.

| Verificação | Resultado | Evidência / limite |
|---|---|---|
| Instalação de dependências (`npm ci`) | Passou | `package-lock.json` sincronizado com `package.json`. |
| Testes automatizados (`npm test`) | Passou | 102 testes em 11 arquivos. |
| Build web (`npm run build`) | Passou | Vite gerou `dist/`; há avisos de CSS e tamanho de bundle, sem falha de compilação. |
| Lint do arquivo alterado (`npx eslint src/pages/Segmento.tsx`) | Passou | Fallback de coordenadas corrigido para valores ausentes ou inválidos. |
| Lint geral (`npm run lint`) | Falhou | 64 erros e 16 avisos já distribuídos pelo projeto. Requer limpeza antes de usar lint como gate de CI. |
| Build Android (`assembleDebug`, JDK 21) | Passou | APK de avaliação assinado pela chave debug do Android; nome exibido `VegiaMap`, API mínima 24 e alvo 36. |
| Assinatura e configuração do APK | Passou | `apksigner verify` confirma assinatura v2; o pacote usa os arquivos de `dist`, sem `server.url` do Lovable. |
| Instalação e abertura no Android | Pendente | A validar em emulador e em dispositivo físico. |
| Fluxos manuais autenticados | Pendentes | Os fluxos 2 a 6 de `TESTES_MANUAIS.md` exigem conta de avaliação com permissões apropriadas. |
| Vídeo final | Pendente | O grupo informou que ainda vai gravar a apresentação com seus integrantes. |

O `npm audit --omit=dev` apontou 21 avisos nas dependências de produção (17 altos e 4 moderados). Esses avisos precisam de triagem por pacote e atualização validada antes de tratar o APK como distribuição de produção. O APK desta Sprint é uma versão instalável para avaliação acadêmica; uma publicação comercial requer assinatura de release sob chave do grupo, campanha de calibração adicional e a validação dos fluxos autenticados.
