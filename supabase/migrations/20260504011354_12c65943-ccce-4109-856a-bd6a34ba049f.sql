
-- ============ rocada_events ============
CREATE TABLE public.rocada_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id text NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  responsavel text,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rocada_events_segment ON public.rocada_events(segment_id, data DESC);
ALTER TABLE public.rocada_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rocada events viewable by authenticated"
  ON public.rocada_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators insert rocada events"
  ON public.rocada_events FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  );
CREATE POLICY "Admins delete rocada events"
  ON public.rocada_events FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ segment_observations ============
CREATE TABLE public.segment_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id text NOT NULL,
  texto text NOT NULL,
  autor text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_segment_obs_segment ON public.segment_observations(segment_id, created_at DESC);
ALTER TABLE public.segment_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Observations viewable by authenticated"
  ON public.segment_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators insert observations"
  ON public.segment_observations FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  );
CREATE POLICY "Admins delete observations"
  ON public.segment_observations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ Estender permissões — operadores podem operar segments/alerts ============
DROP POLICY IF EXISTS "Admins update segments" ON public.segments;
CREATE POLICY "Operators update segments"
  ON public.segments FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  );

DROP POLICY IF EXISTS "Admins update alerts" ON public.alerts;
CREATE POLICY "Operators update alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  );

DROP POLICY IF EXISTS "Admins delete alerts" ON public.alerts;
CREATE POLICY "Operators delete alerts"
  ON public.alerts FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  );

-- ============ Realtime ============
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.segments REPLICA IDENTITY FULL;
ALTER TABLE public.rocada_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'segments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.segments';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rocada_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.rocada_events';
  END IF;
END $$;
