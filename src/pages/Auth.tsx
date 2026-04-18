import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user && !loading) navigate("/dashboard", { replace: true }); }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.error("Erro", { description: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-surface-lowest rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">VegiaMap</h1>
            <p className="text-[12px] text-muted-foreground tracking-wider uppercase">Monitoramento ARTESP</p>
          </div>
        </div>

        <div className="inline-flex bg-surface-high rounded-md p-0.5 mb-6">
          <button onClick={() => setMode("signin")} className={`px-4 h-8 rounded text-[12px] font-semibold tracking-wider uppercase ${mode === "signin" ? "bg-surface-lowest" : "text-muted-foreground"}`}>Entrar</button>
          <button onClick={() => setMode("signup")} className={`px-4 h-8 rounded text-[12px] font-semibold tracking-wider uppercase ${mode === "signup" ? "bg-surface-lowest" : "text-muted-foreground"}`}>Criar conta</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="label-md mb-1.5 block">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:bg-surface-high text-[14px]" />
            </div>
          )}
          <div>
            <label className="label-md mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:bg-surface-high text-[14px]" />
          </div>
          <div>
            <label className="label-md mb-1.5 block">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full h-11 px-3 rounded-lg bg-surface-low outline-none focus:bg-surface-high text-[14px]" />
          </div>
          <button disabled={busy} type="submit" className="w-full h-11 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[13px] font-semibold tracking-wider uppercase disabled:opacity-50">
            {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
