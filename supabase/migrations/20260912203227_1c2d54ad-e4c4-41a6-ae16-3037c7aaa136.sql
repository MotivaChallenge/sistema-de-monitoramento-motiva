CREATE TABLE public.height_model_calibration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL DEFAULT 'ndvi-linear',
  model_version text NOT NULL,
  slope numeric NOT NULL,
  intercept numeric NOT NULL,
  n_pairs integer NOT NULL,
  mae_cm numeric,
  rmse_cm numeric,
  bias_cm numeric,
  r2 numeric,
  residual_sd_cm numeric,
  uncertainty_cm numeric,
  max_lag_days integer NOT NULL DEFAULT 7,
  method text NOT NULL DEFAULT 'ols + loocv',
  active boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_hmc_active ON public.height_model_calibration(active) WHERE active;
CREATE INDEX idx_hmc_created ON public.height_model_calibration(created_at DESC);

GRANT SELECT ON public.height_model_calibration TO authenticated;
GRANT ALL ON public.height_model_calibration TO service_role;
ALTER TABLE public.height_model_calibration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calibration viewable by authenticated" ON public.height_model_calibration
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert calibration" ON public.height_model_calibration
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update calibration" ON public.height_model_calibration
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

GRANT INSERT, UPDATE ON public.height_model_calibration TO authenticated;