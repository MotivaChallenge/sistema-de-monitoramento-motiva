
-- Enums
DO $$ BEGIN
  CREATE TYPE public.team_status AS ENUM ('disponivel','campo','manutencao','afastada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.work_order_status AS ENUM ('pendente','em_andamento','concluida','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.work_order_priority AS ENUM ('baixa','media','alta','critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend field_teams
ALTER TABLE public.field_teams
  ADD COLUMN IF NOT EXISTS funcionarios integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacidade_dia integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regiao text NOT NULL DEFAULT 'Centro',
  ADD COLUMN IF NOT EXISTS status public.team_status NOT NULL DEFAULT 'disponivel',
  ADD COLUMN IF NOT EXISTS eficiencia integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_field_teams_updated_at ON public.field_teams;
CREATE TRIGGER trg_field_teams_updated_at
BEFORE UPDATE ON public.field_teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tighten field_teams write policies (admin/operator only)
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='field_teams'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.field_teams', p.policyname); END LOOP;
END $$;

CREATE POLICY "Authenticated can view field_teams"
  ON public.field_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/operator insert field_teams"
  ON public.field_teams FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admin/operator update field_teams"
  ON public.field_teams FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admin only delete field_teams"
  ON public.field_teams FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Tighten segment_team_assignment write policies
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='segment_team_assignment'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.segment_team_assignment', p.policyname); END LOOP;
END $$;

CREATE POLICY "Authenticated can view segment_team_assignment"
  ON public.segment_team_assignment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/operator write segment_team_assignment"
  ON public.segment_team_assignment FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

-- Work orders
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  segment_id text NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.field_teams(id) ON DELETE SET NULL,
  tipo_servico text NOT NULL DEFAULT 'rocada',
  priority public.work_order_priority NOT NULL DEFAULT 'media',
  status public.work_order_status NOT NULL DEFAULT 'pendente',
  scheduled_for date,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view work_orders"
  ON public.work_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/operator insert work_orders"
  ON public.work_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admin/operator update work_orders"
  ON public.work_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admin only delete work_orders"
  ON public.work_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_work_orders_segment ON public.work_orders(segment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_team ON public.work_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
