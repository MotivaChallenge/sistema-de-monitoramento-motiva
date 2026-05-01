import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserSettings {
  theme: "dark" | "light";
  density: "comfortable" | "compact";
  irc_weight_ndvi: number;
  irc_weight_altura: number;
  irc_weight_idade: number;
  irc_weight_chuva: number;
  altura_critica_cm: number;
  altura_atencao_cm: number;
  notify_critico: boolean;
  notify_atencao: boolean;
  notify_email: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  density: "comfortable",
  irc_weight_ndvi: 35,
  irc_weight_altura: 30,
  irc_weight_idade: 20,
  irc_weight_chuva: 15,
  altura_critica_cm: 30,
  altura_atencao_cm: 15,
  notify_critico: true,
  notify_atencao: true,
  notify_email: false,
};

interface Ctx {
  settings: UserSettings;
  loading: boolean;
  saving: boolean;
  save: (next: UserSettings) => Promise<{ error?: string }>;
  reset: () => void;
}

const SettingsCtx = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  saving: false,
  save: async () => ({}),
  reset: () => {},
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) { setSettings(DEFAULT_SETTINGS); setLoading(false); return; }
    setLoading(true);
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!active) return;
      if (data) {
        setSettings({
          theme: (data.theme as any) ?? "dark",
          density: (data.density as any) ?? "comfortable",
          irc_weight_ndvi: data.irc_weight_ndvi,
          irc_weight_altura: data.irc_weight_altura,
          irc_weight_idade: data.irc_weight_idade,
          irc_weight_chuva: data.irc_weight_chuva,
          altura_critica_cm: data.altura_critica_cm,
          altura_atencao_cm: data.altura_atencao_cm,
          notify_critico: data.notify_critico,
          notify_atencao: data.notify_atencao,
          notify_email: data.notify_email,
        });
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  // Apply theme (data-theme attribute on html)
  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === "light") html.classList.add("light"); else html.classList.remove("light");
    html.dataset.density = settings.density;
  }, [settings.theme, settings.density]);

  const save = useCallback(async (next: UserSettings) => {
    if (!user) return { error: "Não autenticado" };
    const sum = next.irc_weight_ndvi + next.irc_weight_altura + next.irc_weight_idade + next.irc_weight_chuva;
    if (sum !== 100) return { error: `Os pesos do IRC devem somar 100 (atual: ${sum}).` };
    if (next.altura_atencao_cm >= next.altura_critica_cm) {
      return { error: "Altura de atenção deve ser menor que a crítica." };
    }
    setSaving(true);
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) return { error: error.message };
    setSettings(next);
    return {};
  }, [user]);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, loading, saving, save, reset }), [settings, loading, saving, save, reset]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
};

export const useSettings = () => useContext(SettingsCtx);
