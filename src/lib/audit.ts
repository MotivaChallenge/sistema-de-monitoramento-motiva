import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AuditPayload {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Json | null;
  after?: Json | null;
  reason?: string | null;
  origin?: string;
}

const getOrigin = (): string => {
  if (typeof window !== "undefined") return window.location.pathname;
  return "server";
};

/**
 * Registra uma ação no audit_log.
 * Falhas são silenciosas (não quebram a operação principal) e logadas no console.
 */
export const logAudit = async (payload: AuditPayload): Promise<void> => {
  try {
    const { data, error: sessionError } = await supabase.auth.getUser();

    if (sessionError) {
      console.warn("[audit] não foi possível obter usuário:", sessionError.message);
    }

    const user = data?.user;
    const insert = {
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      action: payload.action,
      entity: payload.entity,
      entity_id: payload.entityId ?? null,
      before_value: payload.before ?? null,
      after_value: payload.after ?? null,
      reason: payload.reason ?? null,
      origin: payload.origin ?? getOrigin(),
    };

    const { error } = await supabase.from("audit_log").insert([insert]);

    if (error) {
      console.warn("[audit] falha ao registrar:", error.message);
    }
  } catch (err) {
    console.warn("[audit] exceção ao registrar:", err);
  }
};

/**
 * Compara dois objetos planos e retorna apenas os campos que mudaram.
 * Útil para preencher before/after sem enviar o objeto inteiro.
 */
export const diffForAudit = (
  before: Record<string, Json | undefined>,
  after: Record<string, Json | undefined>
): Record<string, { from: Json | undefined; to: Json | undefined }> | null => {
  const changed: Record<string, { from: Json | undefined; to: Json | undefined }> = {};
  let hasChange = false;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed[key] = { from: before[key], to: after[key] };
      hasChange = true;
    }
  }
  return hasChange ? changed : null;
};
