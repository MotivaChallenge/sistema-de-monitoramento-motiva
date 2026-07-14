
-- 1) highways
CREATE TABLE public.highways (
  code text PRIMARY KEY,
  nome text NOT NULL,
  concessao text NOT NULL,
  uf_inicio text NOT NULL,
  uf_fim text NOT NULL,
  km_inicio numeric NOT NULL,
  km_fim numeric NOT NULL,
  start_lat numeric NOT NULL,
  start_lng numeric NOT NULL,
  end_lat numeric NOT NULL,
  end_lng numeric NOT NULL,
  cor text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.highways TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.highways TO authenticated;
GRANT ALL ON public.highways TO service_role;

ALTER TABLE public.highways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highways são públicas para leitura"
  ON public.highways FOR SELECT USING (true);

CREATE POLICY "Admins e operadores podem gerenciar rodovias (insert)"
  ON public.highways FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE POLICY "Admins e operadores podem gerenciar rodovias (update)"
  ON public.highways FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE POLICY "Admins e operadores podem gerenciar rodovias (delete)"
  ON public.highways FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE TRIGGER trg_highways_updated_at
  BEFORE UPDATE ON public.highways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) segments.rodovia
ALTER TABLE public.segments
  ADD COLUMN IF NOT EXISTS rodovia text;

UPDATE public.segments SET rodovia = 'SP-021' WHERE rodovia IS NULL;

-- 3) FKs (defer highway insertion via NOT VALID and validate later)
ALTER TABLE public.km_markers
  ADD CONSTRAINT km_markers_rodovia_fkey
  FOREIGN KEY (rodovia) REFERENCES public.highways(code) ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.segments
  ADD CONSTRAINT segments_rodovia_fkey
  FOREIGN KEY (rodovia) REFERENCES public.highways(code) ON DELETE SET NULL
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_km_markers_rodovia ON public.km_markers(rodovia);
CREATE INDEX IF NOT EXISTS idx_segments_rodovia ON public.segments(rodovia);
