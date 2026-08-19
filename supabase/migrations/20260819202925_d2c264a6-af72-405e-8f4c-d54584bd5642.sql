ALTER TABLE public.cv_results
  ADD COLUMN IF NOT EXISTS segment_id text REFERENCES public.segments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rodovia text REFERENCES public.highways(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS km_value numeric,
  ADD COLUMN IF NOT EXISTS km_start numeric,
  ADD COLUMN IF NOT EXISTS km_end numeric,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS image_ref text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS threshold numeric,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cv_results_segment ON public.cv_results(segment_id);
CREATE INDEX IF NOT EXISTS idx_cv_results_rodovia ON public.cv_results(rodovia);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before_value jsonb,
  after_value jsonb,
  reason text,
  origin text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_insert_authenticated" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audit_log_select_authenticated" ON public.audit_log
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);