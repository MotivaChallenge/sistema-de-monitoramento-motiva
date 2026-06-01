
-- Histórico NDVI por segmento (alimenta gráficos de evolução e tendência)
CREATE TABLE public.segment_ndvi_history (
  id BIGSERIAL PRIMARY KEY,
  segment_id TEXT NOT NULL,
  data DATE NOT NULL,
  ndvi NUMERIC NOT NULL,
  altura_cm INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_segment_ndvi_history_segment_date ON public.segment_ndvi_history(segment_id, data DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.segment_ndvi_history TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE segment_ndvi_history_id_seq TO authenticated;
GRANT ALL ON public.segment_ndvi_history TO service_role;

ALTER TABLE public.segment_ndvi_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NDVI history viewable by authenticated"
  ON public.segment_ndvi_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert NDVI history"
  ON public.segment_ndvi_history FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update NDVI history"
  ON public.segment_ndvi_history FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete NDVI history"
  ON public.segment_ndvi_history FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Equipes de campo
CREATE TABLE public.field_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  base_km NUMERIC NOT NULL,
  tempo_resposta_min INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_teams TO authenticated;
GRANT ALL ON public.field_teams TO service_role;

ALTER TABLE public.field_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams viewable by authenticated"
  ON public.field_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage teams"
  ON public.field_teams FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Atribuição equipe→segmento
CREATE TABLE public.segment_team_assignment (
  segment_id TEXT NOT NULL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.field_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.segment_team_assignment TO authenticated;
GRANT ALL ON public.segment_team_assignment TO service_role;

ALTER TABLE public.segment_team_assignment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assignments viewable by authenticated"
  ON public.segment_team_assignment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage assignments"
  ON public.segment_team_assignment FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed: histórico NDVI (7 leituras por segmento, curva derivada do estado atual)
INSERT INTO public.segment_ndvi_history (segment_id, data, ndvi, altura_cm)
SELECT
  s.id,
  (CURRENT_DATE - (i.offset_days * INTERVAL '5 days'))::date AS data,
  GREATEST(0.1, LEAST(0.95,
    s.ndvi + (CASE WHEN s.status = 'critico' THEN -1 ELSE 1 END) * (i.offset_days * 0.025) + ((random() - 0.5) * 0.04)
  ))::numeric(4,2) AS ndvi,
  GREATEST(5, ROUND(
    s.altura - (CASE WHEN s.status = 'critico' THEN 1 ELSE 0 END) * (i.offset_days * 3) + ((random() - 0.5) * 4)
  ))::int AS altura_cm
FROM public.segments s
CROSS JOIN (SELECT generate_series(0, 6) AS offset_days) i;

-- Seed: equipes
INSERT INTO public.field_teams (nome, base_km, tempo_resposta_min) VALUES
  ('Consórcio SP-Verde', 12, 15),
  ('Brigada Norte Rodoanel', 5, 22),
  ('Equipe Sul Conservação', 24, 18);

-- Seed: atribuição (rateia por proximidade da base)
INSERT INTO public.segment_team_assignment (segment_id, team_id)
SELECT s.id, (
  SELECT t.id FROM public.field_teams t
  ORDER BY ABS(t.base_km - s.km_start) ASC
  LIMIT 1
) FROM public.segments s;
