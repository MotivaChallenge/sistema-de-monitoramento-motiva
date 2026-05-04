import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  canEdit: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, isAdmin: false, isOperator: false, canEdit: false, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(async () => {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", sess.user.id);
          setIsAdmin(!!data?.some(r => r.role === "admin"));
          setIsOperator(!!data?.some(r => r.role === "operator"));
        }, 0);
      } else {
        setIsAdmin(false);
        setIsOperator(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).then(({ data }) => {
          setIsAdmin(!!data?.some(r => r.role === "admin"));
          setIsOperator(!!data?.some(r => r.role === "operator"));
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return <Ctx.Provider value={{ user, session, loading, isAdmin, isOperator, canEdit: isAdmin || isOperator, signOut }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
