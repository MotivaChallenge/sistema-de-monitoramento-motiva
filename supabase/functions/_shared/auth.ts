import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "./cors.ts";

export interface AuthResult {
  /** Resposta 401 pronta quando não há sessão válida; undefined quando autenticado. */
  response?: Response;
  userId?: string;
  /** Client com a chave publicável e o Authorization do chamador — respeita RLS. */
  userClient?: SupabaseClient;
}

/**
 * Valida o JWT do chamador antes de qualquer consulta ao banco ou chamada paga de IA.
 * Edge functions são publicadas com verify_jwt desativado, então a checagem é feita aqui.
 */
export async function requireUser(req: Request): Promise<AuthResult> {
  const unauthorized = () =>
    new Response(JSON.stringify({ error: "Não autorizado. Faça login para usar este recurso." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { response: unauthorized() };

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) return { response: unauthorized() };

  return { userId: data.user.id, userClient };
}
