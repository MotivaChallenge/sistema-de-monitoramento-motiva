
-- Marcos quilométricos (Rodoanel Oeste)
CREATE TABLE public.km_markers (
  id SERIAL PRIMARY KEY,
  km_value NUMERIC NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  rodovia TEXT NOT NULL DEFAULT 'SP-021',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_km_markers_km ON public.km_markers(km_value);
ALTER TABLE public.km_markers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KM markers viewable by authenticated users" ON public.km_markers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert km markers" ON public.km_markers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update km markers" ON public.km_markers FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete km markers" ON public.km_markers FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Classificação de roçada (polígonos com tipo de equipamento)
CREATE TABLE public.rocada_classification (
  id SERIAL PRIMARY KEY,
  classe TEXT NOT NULL,
  centroid_lat NUMERIC NOT NULL,
  centroid_lng NUMERIC NOT NULL,
  area_m2 NUMERIC,
  km_approx NUMERIC,
  polygon_coords JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rocada_classe ON public.rocada_classification(classe);
CREATE INDEX idx_rocada_km ON public.rocada_classification(km_approx);
ALTER TABLE public.rocada_classification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rocada classification viewable by authenticated users" ON public.rocada_classification FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert rocada" ON public.rocada_classification FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update rocada" ON public.rocada_classification FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete rocada" ON public.rocada_classification FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Cabeçalho de relatório de inspeção
CREATE TABLE public.inspection_reports (
  id SERIAL PRIMARY KEY,
  report_code TEXT NOT NULL UNIQUE,
  rodovia TEXT NOT NULL DEFAULT 'SP-021',
  unidade TEXT NOT NULL DEFAULT 'RA',
  versao TEXT,
  km_start NUMERIC NOT NULL DEFAULT 0,
  km_end NUMERIC NOT NULL DEFAULT 29.3,
  data_levantamento DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports viewable by authenticated users" ON public.inspection_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert reports" ON public.inspection_reports FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update reports" ON public.inspection_reports FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete reports" ON public.inspection_reports FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Medições por (relatório, item, KM)
CREATE TABLE public.inspection_measurements (
  id BIGSERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES public.inspection_reports(id) ON DELETE CASCADE,
  item_codigo TEXT NOT NULL,
  item_descricao TEXT NOT NULL,
  km_offset INTEGER NOT NULL,
  nivel SMALLINT,
  na BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meas_report ON public.inspection_measurements(report_id);
CREATE INDEX idx_meas_km ON public.inspection_measurements(km_offset);
CREATE INDEX idx_meas_nivel ON public.inspection_measurements(nivel);
ALTER TABLE public.inspection_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Measurements viewable by authenticated users" ON public.inspection_measurements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert measurements" ON public.inspection_measurements FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update measurements" ON public.inspection_measurements FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete measurements" ON public.inspection_measurements FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
