CREATE TABLE public.model_validation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id text NOT NULL,
  model_version text NOT NULL,
  calibration_date date,
  sample_count integer,
  validation_sample_count integer,
  mae_cm numeric,
  rmse_cm numeric,
  bias_cm numeric,
  confidence_level numeric,
  uncertainty_cm numeric,
  uncertainty_method text,
  metrics_by_vegetation jsonb,
  metrics_by_height_range jsonb,
  last_field_validation_at date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (model_id, model_version)
);

GRANT SELECT ON public.model_validation TO authenticated;
GRANT ALL ON public.model_validation TO service_role;

ALTER TABLE public.model_validation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem validacao do modelo"
  ON public.model_validation FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins gerenciam validacao do modelo"
  ON public.model_validation FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_model_validation_updated_at
  BEFORE UPDATE ON public.model_validation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();