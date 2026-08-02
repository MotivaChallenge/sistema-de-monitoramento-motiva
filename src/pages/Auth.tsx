import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { z } from "zod";

const signinSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha muito curta").max(128),
});

const friendlyError = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already exists")) return "Já existe uma conta com esse email.";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar.";
  if (m.includes("pwned") || m.includes("compromised")) return "Esta senha aparece em vazamentos públicos. Escolha outra.";
  return msg;
};

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { if (user && !loading) navigate("/dashboard", { replace: true }); }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = signinSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach(i => { fe[String(i.path[0])] = i.message; });
      setErrors(fe);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bem-vindo de volta");
    } catch (err: any) {
      toast.error("Erro", { description: friendlyError(err.message ?? String(err)) });
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async () => {
    if (!email) { setErrors({ email: "Informe seu email para receber o link." }); return; }
    const ok = z.string().email().safeParse(email).success;
    if (!ok) { setErrors({ email: "Email inválido" }); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error("Erro", { description: friendlyError(error.message) });
    else toast.success("Email enviado", { description: "Confira sua caixa de entrada." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-surface-lowest rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Leaf className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">Acesso ao painel</h1>
            <p className="text-[12px] text-muted-foreground">Monitoramento de vegetação rodoviária</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label-md mb-1.5 block">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:ring-2 focus:ring-primary/40 text-[14px]" />
            {errors.email && <p className="text-[11px] text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="label-md">Senha</label>
              <button type="button" onClick={onForgot} className="text-[11px] text-primary-glow hover:underline">
                Esqueci minha senha
              </button>
            </div>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:ring-2 focus:ring-primary/40 text-[14px]" />
            {errors.password && <p className="text-[11px] text-destructive mt-1">{errors.password}</p>}
          </div>
          <button disabled={busy} type="submit" className="w-full h-11 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold tracking-wider uppercase disabled:opacity-50">
            {busy ? "Aguarde…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
