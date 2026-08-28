import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { setIRCWeights } from "@/lib/irc";
import { setHeightThresholds } from "@/lib/status";
import { useQueryClient } from "@tanstack/react-query";

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
  theme: "light",
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

const LS_KEY = "motiva:settings";

const readLocal = (): UserSettings | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : null;
  } catch { return null; }
};

/** Validação compartilhada (client + antes de persistir). */
export const validateSettings = (s: UserSettings): string | null => {
  const nums: [string, number][] = [
    ["Peso do NDVI", s.irc_weight_ndvi],
    ["Peso da altura", s.irc_weight_altura],
    ["Peso da idade da roçada", s.irc_weight_idade],
    ["Peso da chuva", s.irc_weight_chuva],
    ["Altura de atenção", s.altura_atencao_cm],
    ["Altura crítica", s.altura_critica_cm],
  ];
  for (const [label, v] of nums) {
    if (v === null || v === undefined || Number.isNaN(v)) return `${label}: preencha um valor numérico.`;
    if (!Number.isFinite(v)) return `${label}: valor inválido.`;
    if (v < 0) return `${label}: não pode ser negativo.`;
  }
  if (s.altura_atencao_cm < 1) return "Altura de atenção deve ser de pelo menos 1 cm.";
  if (s.altura_critica_cm < 1) return "Altura crítica deve ser de pelo menos 1 cm.";
  const sum = s.irc_weight_ndvi + s.irc_weight_altura + s.irc_weight_idade + s.irc_weight_chuva;
  if (sum !== 100) return `Os pesos do IRC devem somar 100 (atual: ${sum}).`;
  if (s.altura_critica_cm < s.altura_atencao_cm) {
    return "Altura crítica deve ser maior ou igual à altura de atenção.";
  }
  return null;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [settings, setSettings] = useState<UserSettings>(() => readLocal() ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) { setSettings(readLocal() ?? DEFAULT_SETTINGS); setLoading(false); return; }
    setLoading(true);
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!active) return;
      if (data) {
        const next: UserSettings = {
          theme: (data.theme as any) ?? "light",
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
        };
        setSettings(next);
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  // Apply theme + density to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", settings.theme === "dark");
    html.classList.toggle("light", settings.theme === "light");
    html.dataset.density = settings.density;
  }, [settings.theme, settings.density]);

  // Propaga pesos do IRC para o cálculo global
  useEffect(() => {
    setIRCWeights({
      ndvi: settings.irc_weight_ndvi,
      altura: settings.irc_weight_altura,
      idade: settings.irc_weight_idade,
      chuva: settings.irc_weight_chuva,
    });
  }, [settings.irc_weight_ndvi, settings.irc_weight_altura, settings.irc_weight_idade, settings.irc_weight_chuva]);

  // Limiares de altura -> reclassificação dos trechos
  useEffect(() => {
    setHeightThresholds({
      atencao: settings.altura_atencao_cm,
      critico: settings.altura_critica_cm,
    });
    qc.invalidateQueries({ queryKey: ["segments"] });
    qc.invalidateQueries({ queryKey: ["segment"] });
    qc.invalidateQueries({ queryKey: ["ndvi_heatmap"] });
  }, [settings.altura_atencao_cm, settings.altura_critica_cm, qc]);


  const save = useCallback(async (next: UserSettings) => {
    if (!user) return { error: "Não autenticado" };
    const invalid = validateSettings(next);
    if (invalid) return { error: invalid };
    setSaving(true);
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) return { error: error.message };
    setSettings(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return {};
  }, [user]);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, loading, saving, save, reset }), [settings, loading, saving, save, reset]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
};

export const useSettings = () => useContext(SettingsCtx);
