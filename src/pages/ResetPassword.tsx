import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Senha precisa ter pelo menos 8 caracteres")
  .max(128)
  .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
  .regex(/\d/, "Inclua ao menos um número");

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase v2: o link de recovery cria sessão temporária via hash. Verificar.
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Erro ao atualizar senha", { description: error.message });
    } else {
      toast.success("Senha atualizada", { description: "Use a nova senha para entrar." });
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-surface-lowest rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Leaf className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">Redefinir senha</h1>
            <p className="text-[12px] text-muted-foreground">Escolha uma nova senha para sua conta.</p>
          </div>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Link inválido ou expirado. Solicite um novo a partir da tela de login.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="pw" className="label-md mb-1.5 block">Nova senha</label>
              <input id="pw" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:ring-2 focus:ring-primary/40 text-[14px]" />
            </div>
            <div>
              <label htmlFor="pw2" className="label-md mb-1.5 block">Confirmar senha</label>
              <input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:ring-2 focus:ring-primary/40 text-[14px]" />
            </div>
            {error && <p className="text-[12px] text-destructive">{error}</p>}
            <button disabled={busy} type="submit" className="w-full h-11 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold tracking-wider uppercase disabled:opacity-50">
              {busy ? "Atualizando…" : "Atualizar senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
