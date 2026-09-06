CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE public.segment_satellite_readings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  segment_id text NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  period_start date,
  period_end date,
  images integer NOT NULL DEFAULT 0,
  valid_pixels integer NOT NULL DEFAULT 0,
  ndvi_median numeric, ndvi_mean numeric, ndvi_std numeric, ndvi_min numeric, ndvi_max numeric,
  evi_median numeric, savi_median numeric,
  buffer_m numeric NOT NULL DEFAULT 30,
  model_id text NOT NULL DEFAULT 'ndvi-linear',
  model_version text NOT NULL DEFAULT 'v1.0',
  altura_cm integer,
  uncertainty_cm numeric,
  saturated boolean NOT NULL DEFAULT false,
  origin text NOT NULL DEFAULT 'sentinel2',
  source text NOT NULL DEFAULT 'Sentinel-2 SR Harmonized · Google Earth Engine',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ssr_segment_read ON public.segment_satellite_readings(segment_id, read_at DESC);
GRANT SELECT ON public.segment_satellite_readings TO authenticated;
GRANT ALL ON public.segment_satellite_readings TO service_role;
ALTER TABLE public.segment_satellite_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Readings viewable by authenticated" ON public.segment_satellite_readings FOR SELECT TO authenticated USING (true);

CREATE TABLE public.field_height_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id text NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  measured_at date NOT NULL DEFAULT CURRENT_DATE,
  altura_cm integer NOT NULL CHECK (altura_cm >= 0 AND altura_cm <= 500),
  autor text,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fhm_segment ON public.field_height_measurements(segment_id, measured_at DESC);
GRANT SELECT, INSERT, DELETE ON public.field_height_measurements TO authenticated;
GRANT ALL ON public.field_height_measurements TO service_role;
ALTER TABLE public.field_height_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Measurements viewable by authenticated" ON public.field_height_measurements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators insert measurements" ON public.field_height_measurements FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Admins delete measurements" ON public.field_height_measurements FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.segments
  ADD COLUMN IF NOT EXISTS ndvi_source text NOT NULL DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS last_satellite_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS uncertainty_cm numeric,
  ADD COLUMN IF NOT EXISTS satellite_images integer,
  ADD COLUMN IF NOT EXISTS satellite_valid_pixels integer;

CREATE TABLE public.satellite_refresh_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rodovia text NOT NULL,
  trigger text NOT NULL DEFAULT 'manual',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  total integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  details jsonb,
  started_by uuid
);
GRANT SELECT ON public.satellite_refresh_runs TO authenticated;
GRANT ALL ON public.satellite_refresh_runs TO service_role;
ALTER TABLE public.satellite_refresh_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Runs viewable by authenticated" ON public.satellite_refresh_runs FOR SELECT TO authenticated USING (true);

-- Token do cron guardado no cofre; verificado pela função de borda via RPC restrita ao service_role.
SELECT vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'gee_refresh_cron_token', 'Token para o agendamento semanal do Sentinel-2');

CREATE OR REPLACE FUNCTION public.verify_cron_token(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, vault AS $$
  SELECT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'gee_refresh_cron_token' AND decrypted_secret = _token);
$$;
REVOKE ALL ON FUNCTION public.verify_cron_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_token(text) TO service_role;

-- Segunda-feira 03:00 America/Sao_Paulo = 06:00 UTC
SELECT cron.schedule(
  'gee-refresh-segments-weekly',
  '0 6 * * 1',
  $job$
  SELECT net.http_post(
    url := 'https://fmriusgclchagcgthxpv.supabase.co/functions/v1/gee-refresh-segments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'gee_refresh_cron_token')
    ),
    body := '{"rodovia":"SP-021","trigger":"cron"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $job$
);