import { useEffect, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { z } from "zod";

const signinSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha muito curta").max(128),
});
const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  password: z
    .string()
    .min(8, "Senha precisa ter pelo menos 8 caracteres")
    .max(128)
    .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
    .regex(/\d/, "Inclua ao menos um número"),
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { if (user && !loading) navigate("/dashboard", { replace: true }); }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const schema = mode === "signup" ? signupSchema : signinSchema;
    const parsed = schema.safeParse(mode === "signup" ? { name, email, password } : { email, password });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach(i => { fe[String(i.path[0])] = i.message; });
      setErrors(fe);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { display_name: name } },
        });
        if (error) throw error;
        toast.success("Conta criada", { description: "Verifique seu email para confirmar." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta");
      }
    } catch (err: any) {
      toast.error("Erro", { description: friendlyError(err.message ?? String(err)) });
    } finally {
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) {
      toast.error("Falha no Google", { description: (result.error as Error).message });
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
            <h1 className="text-[20px] font-bold tracking-tight">ORION</h1>
            <p className="text-[12px] text-muted-foreground tracking-wider uppercase">Roadside Intelligence Platform</p>
          </div>
        </div>

        <div className="inline-flex bg-surface-high rounded-md p-0.5 mb-6" role="tablist" aria-label="Modo de autenticação">
          <button role="tab" aria-selected={mode==="signin"} onClick={() => setMode("signin")} className={`px-4 h-8 rounded text-[12px] font-semibold tracking-wider uppercase ${mode === "signin" ? "bg-surface-lowest" : "text-muted-foreground"}`}>Entrar</button>
          <button role="tab" aria-selected={mode==="signup"} onClick={() => setMode("signup")} className={`px-4 h-8 rounded text-[12px] font-semibold tracking-wider uppercase ${mode === "signup" ? "bg-surface-lowest" : "text-muted-foreground"}`}>Criar conta</button>
        </div>

        <button
          onClick={signInGoogle}
          disabled={busy}
          aria-label="Continuar com Google"
          className="w-full h-11 rounded-lg bg-surface-high hover:bg-surface-low text-foreground text-[13px] font-semibold inline-flex items-center justify-center gap-2 mb-4 disabled:opacity-50 border border-border"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continuar com Google
        </button>

        <div className="flex items-center gap-3 mb-4 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="flex-1 h-px bg-border" /> ou <span className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="label-md mb-1.5 block">Nome</label>
              <input id="name" value={name} onChange={e => setName(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:ring-2 focus:ring-primary/40 text-[14px]" />
              {errors.name && <p className="text-[11px] text-destructive mt-1">{errors.name}</p>}
            </div>
          )}
          <div>
            <label htmlFor="email" className="label-md mb-1.5 block">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:ring-2 focus:ring-primary/40 text-[14px]" />
            {errors.email && <p className="text-[11px] text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="label-md">Senha</label>
              {mode === "signin" && (
                <button type="button" onClick={onForgot} className="text-[11px] text-primary-glow hover:underline">
                  Esqueci minha senha
                </button>
              )}
            </div>
            <input id="password" type="password" autoComplete={mode==="signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:ring-2 focus:ring-primary/40 text-[14px]" />
            {errors.password && <p className="text-[11px] text-destructive mt-1">{errors.password}</p>}
            {mode === "signup" && !errors.password && (
              <p className="text-[11px] text-muted-foreground mt-1">Mínimo 8 caracteres, com letra e número.</p>
            )}
          </div>
          <button disabled={busy} type="submit" className="w-full h-11 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold tracking-wider uppercase disabled:opacity-50">
            {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          <Link to="/" className="hover:underline">← Voltar à página inicial</Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
