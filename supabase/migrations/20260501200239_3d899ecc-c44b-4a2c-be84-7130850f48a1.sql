-- Tabela de configurações por usuário
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- UI
  theme text NOT NULL DEFAULT 'dark',         -- 'dark' | 'light'
  density text NOT NULL DEFAULT 'comfortable', -- 'comfortable' | 'compact'
  -- IRC weights (devem somar 100, validado no client)
  irc_weight_ndvi integer NOT NULL DEFAULT 35,
  irc_weight_altura integer NOT NULL DEFAULT 30,
  irc_weight_idade integer NOT NULL DEFAULT 20,
  irc_weight_chuva integer NOT NULL DEFAULT 15,
  -- Limiares
  altura_critica_cm integer NOT NULL DEFAULT 30,
  altura_atencao_cm integer NOT NULL DEFAULT 15,
  -- Notificações
  notify_critico boolean NOT NULL DEFAULT true,
  notify_atencao boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own settings"
  ON public.user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();