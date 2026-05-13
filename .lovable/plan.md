
# Plano de melhorias para lançamento — Vegia / Motiva Rodovias

Foco em deixar o produto pronto para usuários reais: segurança de auth, identidade pública (SEO/meta), polimento de UX, robustez de dados e operação. Organizado em sprints curtas.

---

## Sprint 1 — Bloqueadores de lançamento (P0)

1. **Identidade pública e SEO**
   - `index.html`: trocar `<title>` "Lovable App" por "Vegia · Motiva Rodovias — Monitoramento de Vegetação".
   - `<meta description>`, OG/Twitter (title, description, image) com a marca Motiva.
   - Favicon e `apple-touch-icon` com o logo Motiva (hoje é placeholder).
   - `lang="pt-BR"` no `<html>`.
   - Adicionar JSON-LD `Organization` + `SoftwareApplication`.
   - Garantir `<h1>` único por página e `alt` em todas as imagens.

2. **Auth pronta para produção**
   - Adicionar **Google sign-in** na tela `/auth` (botão + `signInWithOAuth`).
   - Validar inputs com **zod** (email válido, senha ≥ 8 com letra+número, nome ≤ 100).
   - Mensagens de erro amigáveis em PT (mapear `Invalid login credentials`, `User already registered`, etc.).
   - Link "Esqueci minha senha" (fluxo `resetPasswordForEmail` + página `/auth/reset`).
   - Habilitar **Leaked Password Protection (HIBP)** via `configure_auth`.
   - Confirmar que confirmação de email está LIGADA (não auto-confirm).

3. **Landing page real em `/`**
   - Hoje `Index.tsx` redireciona direto para `/dashboard` — visitante deslogado nunca vê o produto.
   - Criar landing curta com: hero (proposta de valor), 3 features (NDVI, IA, ARTESP), screenshot do dashboard, CTA "Entrar" / "Solicitar acesso", footer com Motiva.
   - SEO completo na landing (H1, meta, OG).

4. **Erro/empty states restantes**
   - Páginas que ainda usam texto puro de loading: `Relatorio`, `Alertas`, `AnaliseCV`, `Configuracoes` → padronizar com `<Skeleton>` e empty states.
   - 404 (`NotFound.tsx`): revisar copy e adicionar botão "Voltar ao painel".

---

## Sprint 2 — Confiabilidade e operação (P0/P1)

5. **Realtime nos alertas**
   - `ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts`.
   - Subscription no `useAlertsFeed` para badge da sidebar piscar quando vier novo crítico.
   - Toast discreto "Novo alerta crítico em KM XX".

6. **CRUD de operador (já tem `app_role`, falta UI)**
   - Em `/segmento/:id`: botões **"Marcar resolvido"**, **"Registrar roçada"** (cria evento + atualiza `ultima_rocada`), **"Adicionar observação"**.
   - Visíveis só se `canEdit` (admin/operator) — `viewer` vê tudo readonly.

7. **Histórico de roçadas real**
   - Nova tabela `rocada_events (segment_id, data, responsavel, observacao)` com RLS.
   - `RocadaTimeline` consumindo dados reais em vez de mock.

8. **Cache da edge function `weather-rodoanel`**
   - TTL 15min em memória ou tabela `weather_cache` para reduzir custo OpenWeather e latência de boot do dashboard.

9. **Rate limit + validação nas edge functions IA**
   - `point-insight`, `vision-detect`, `ai-insights`: validar payload (zod no Deno), limitar tamanho de imagem base64 (≤ 4MB), checar JWT do usuário.
   - Retornar 429 amigável quando Lovable AI estourar limite.

---

## Sprint 3 — UX e polimento (P1)

10. **Mobile real**
    - Testar Dashboard em 375px: grids de 4 colunas viram 2/1, mapa altura responsiva, painel lateral vira aba.
    - Tabela de segmentos com scroll horizontal + densidade compacta.

11. **Acessibilidade**
    - `aria-label` em todos os botões só-ícone (kebab, refresh, fechar).
    - Foco visível (`focus-visible:ring`) consistente nos botões custom.
    - Contraste mínimo AA — auditar com axe.
    - `<label>` associado a todos os `<select>` e `<input>`.

12. **Filtros globais aplicados em todo lugar**
    - Hoje `FiltersContext` só afeta dashboard. Aplicar também em Alertas, Relatório e SegmentTable.
    - Persistir filtros em URL (`?status=critico&km=10-20`).

13. **PDF de relatório — melhorias**
    - Hoje exporta tabela; adicionar miniatura do mapa (Leaflet → canvas via `html2canvas`) e gráfico NDVI.
    - Logo Motiva real no header (já existe asset).

---

## Sprint 4 — Qualidade técnica e analytics (P2)

14. **Tipagem forte**
    - Trocar `mapSegment(r: any)` por `Tables<"segments">` do `types.ts`.
    - Remover `any` residuais em `useVegiaData`, `OSMMap` (markers).

15. **Testes**
    - `lib/irc.ts`: cobrir 100% das fórmulas (já tem 1 teste).
    - `lib/pdf-export.ts`: smoke test gera PDF sem throw.
    - Hook `useFilters` com casos de combinação.

16. **Observabilidade**
    - Adicionar Sentry (ou similar) para capturar runtime errors em produção.
    - Logs estruturados nas edge functions (`console.log(JSON.stringify({ fn, userId, ms }))`).

17. **Pre-deploy checklist automático**
    - Rodar `supabase--linter` (já está limpo).
    - `security--run_security_scan` (1 finding já corrigido).
    - Build prod + bundle analyzer (mapa/charts já com `lazy`, validar tamanho).

---

## Detalhes técnicos

### Auth com Google
```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${window.location.origin}/dashboard` },
});
```
Configurar via `configure_social_auth` (provider já suportado nativamente).

### Realtime alerts
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
```

### Tabela rocada_events
```sql
CREATE TABLE public.rocada_events (
  id uuid PK default gen_random_uuid(),
  segment_id uuid REFERENCES segments(id),
  data date NOT NULL,
  responsavel text,
  observacao text,
  created_by uuid,
  created_at timestamptz default now()
);
-- RLS: viewer SELECT; operator/admin INSERT/UPDATE/DELETE
```

### Estrutura de validação Auth
```ts
const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/\d/),
});
```

---

## Ordem sugerida de execução

```text
Sprint 1 (lançamento)    →  1 SEO/meta  ·  2 Auth (Google + reset + HIBP + zod)  ·  3 Landing  ·  4 Empty states
Sprint 2 (operação)      →  5 Realtime  ·  6 CRUD operador  ·  7 Histórico roçadas  ·  9 Hardening edge funcs
Sprint 3 (polimento)     →  10 Mobile  ·  11 a11y  ·  12 Filtros globais  ·  13 PDF avançado
Sprint 4 (qualidade)     →  14 Tipagem  ·  15 Testes  ·  16 Sentry  ·  17 Checklist
```

---

## Decisão do escopo

Me diga qual sprint (ou itens específicos) entram nesta rodada — ex.: "Sprint 1 inteira", "1 + 2 + 5", "só 2 e 3". Recomendo **Sprint 1 inteira** como mínimo para um lançamento decente.
