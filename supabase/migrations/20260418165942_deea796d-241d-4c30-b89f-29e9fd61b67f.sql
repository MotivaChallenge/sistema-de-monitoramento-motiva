-- Enum for status
CREATE TYPE public.segment_status AS ENUM ('critico', 'atencao', 'conforme');

-- Enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate to prevent escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Segments table
CREATE TABLE public.segments (
  id TEXT PRIMARY KEY,
  km TEXT NOT NULL,
  km_start NUMERIC NOT NULL,
  km_end NUMERIC NOT NULL,
  tipo TEXT NOT NULL,
  ndvi NUMERIC NOT NULL,
  altura INTEGER NOT NULL,
  limite INTEGER NOT NULL DEFAULT 30,
  status public.segment_status NOT NULL,
  clausula TEXT NOT NULL,
  clause_full TEXT NOT NULL,
  ultima_rocada TEXT NOT NULL,
  deadline TEXT,
  deadline_urgent BOOLEAN DEFAULT false,
  notification_id TEXT,
  insight TEXT,
  street JSONB,
  detection JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

-- Alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id TEXT NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  status public.segment_status NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- CV results table
CREATE TABLE public.cv_results (
  id INTEGER PRIMARY KEY,
  km TEXT NOT NULL,
  label TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  status public.segment_status NOT NULL,
  caption TEXT,
  box JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cv_results ENABLE ROW LEVEL SECURITY;

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_segments_updated_at
BEFORE UPDATE ON public.segments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies: profiles
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS Policies: user_roles
CREATE POLICY "Roles viewable by authenticated users"
ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: segments (read all auth, admin-only write)
CREATE POLICY "Segments viewable by authenticated users"
ON public.segments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert segments"
ON public.segments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update segments"
ON public.segments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete segments"
ON public.segments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: alerts
CREATE POLICY "Alerts viewable by authenticated users"
ON public.alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert alerts"
ON public.alerts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update alerts"
ON public.alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete alerts"
ON public.alerts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: cv_results
CREATE POLICY "CV results viewable by authenticated users"
ON public.cv_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert cv_results"
ON public.cv_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update cv_results"
ON public.cv_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete cv_results"
ON public.cv_results FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed segments
INSERT INTO public.segments (id, km, km_start, km_end, tipo, ndvi, altura, limite, status, clausula, clause_full, ultima_rocada, deadline, deadline_urgent, notification_id, insight, street, detection) VALUES
('12-400','KM 12+400',12.4,13.1,'Roçada Mecânica',0.24,180,30,'critico','CL-04.2','CLÁUSULA ARTESP ANEXO 6 §B.1.1 — "A CONCESSIONÁRIA DEVERÁ MANTER A VEGETAÇÃO COM ALTURA MÁXIMA DE 30 CM NOS TALUDES E ÁREAS ADJACENTES À PISTA DE ROLAMENTO. INTERFERÊNCIA EM FAIXA DE VISIBILIDADE OPERACIONAL REQUER INTERVENÇÃO IMEDIATA."','29/03/2026','18/04/2026 08:00',true,'#412','Crescimento acelerado nos últimos 12 dias (+14cm) correlaciona-se com a pluviosidade atípica registrada na Estação Meteorológica E-02. O NDVI de 0,24 indica obstrução ativa da faixa de visibilidade. Recomendação: Mobilização imediata de equipe de roçada mecanizada para evitar multa ARTESP escalonada no Anexo 6.','{"lat":-23.54,"lng":-46.63,"caption":"Visual confirmado: Vegetação obstruindo parcialmente a sinalização vertical K-12."}','{"label":"Grama Crítica","confidence":89.4,"classe":"Poaceae"}'),
('18-150','KM 18+150',18.15,18.8,'Roçada Manual',0.42,60,30,'atencao','CL-04.5','CLÁUSULA ARTESP ANEXO 6 §B.1.5 — "CRESCIMENTO ACELERADO DETECTADO. MONITORAMENTO EM 48H REQUERIDO PARA AVALIAR NECESSIDADE DE ROÇADA CORRETIVA."','12/03/2026','30/04/2026 12:00',false,NULL,'Tendência de crescimento estável. Sugestão: agendar roçada preventiva em até 14 dias.','{"lat":-23.55,"lng":-46.61,"caption":"Faixa de domínio com vegetação em fase de atenção."}','{"label":"Vegetação Densa","confidence":76.1,"classe":"Mista"}'),
('22-900','KM 22+900',22.9,23.6,'Limpeza de Drenagem',0.18,220,30,'critico','CL-04.1','CLÁUSULA ARTESP ANEXO 6 §B.1.0 — "OBSTRUÇÃO DE DRENAGEM POR BIOMASSA. RISCO DE EROSÃO ELEVADO. INTERVENÇÃO PRIORITÁRIA EM 24H."','01/03/2026','17/04/2026 06:00',true,'#418','Drenagem comprometida. Risco de erosão pluvial em evento >20mm/h.','{"lat":-23.56,"lng":-46.59,"caption":"Drenagem obstruída por biomassa acumulada."}','{"label":"Obstrução Drenagem","confidence":92.3,"classe":"Detrito + Vegetação"}'),
('5-800','KM 5+800',5.8,7.2,'Roçada Mecânica',0.71,34,30,'critico','CL-04.2','CLÁUSULA ARTESP ANEXO 6 §B.1.1 — "A CONCESSIONÁRIA DEVERÁ MANTER A VEGETAÇÃO COM ALTURA MÁXIMA DE 30 CM NOS TALUDES E ÁREAS ADJACENTES À PISTA DE ROLAMENTO..."','29/03/2026','18/04/2026 08:00',true,'#412','O crescimento acelerado observado nos últimos 12 dias (+14cm) correlaciona-se com a pluviosidade atípica registrada na Estação Meteorológica E-02. O NDVI de 0,71 indica saturação clorofílica. Recomendação: Mobilização imediata de equipe de roçada mecanizada para evitar multa ARTESP escalonada no Anexo 6.','{"lat":-23.54,"lng":-46.63,"caption":"Visual confirmado: Vegetação obstruindo parcialmente a sinalização vertical K-12."}','{"label":"Grama Crítica","confidence":89.4,"classe":"Poaceae"}'),
('25-200','KM 25+200',25.2,26.0,'Conforme',0.55,18,30,'conforme','C.4.1.2/26','Conformidade vigente conforme última inspeção.','05/04/2026',NULL,false,NULL,NULL,NULL,NULL),
('8-100','KM 8+100',8.1,9.0,'Conforme',0.62,22,30,'conforme','C.4.2.0/26','Conformidade vigente.','08/04/2026',NULL,false,NULL,NULL,NULL,NULL);

-- Seed CV results
INSERT INTO public.cv_results (id, km, label, confidence, status, caption, box) VALUES
(1,'KM 5+820','VEGETACAO_DENS',94.2,'atencao','Invasão de faixa de domínio detectada na borda direita.','{"x":22,"y":28,"w":28,"h":30}'),
(2,'KM 6+150','TRECHO_CONFORME',99.1,'conforme','Visibilidade de sinalização horizontal preservada.','{"x":38,"y":38,"w":24,"h":22}'),
(3,'KM 6+400','BURACO_PISTA',82.8,'critico','Fadiga asfáltica com início de fissuração.','{"x":40,"y":30,"w":18,"h":16}'),
(4,'KM 6+720','ROCADA_OK',96.5,'conforme','Roçada recente confirmada. Faixa de domínio limpa.',NULL),
(5,'KM 6+950','EROSAO_TALUDE',71.4,'atencao','Instabilidade de talude detectada em encosta sul.','{"x":44,"y":32,"w":22,"h":22}'),
(6,'KM 7+200','GEOMETRIA_OK',98.2,'conforme','Geometria da via conforme projeto original.',NULL);

-- Seed alerts from critical/attention segments
INSERT INTO public.alerts (segment_id, status, message)
SELECT id, status, insight FROM public.segments WHERE status IN ('critico','atencao');