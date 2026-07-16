CREATE TABLE public.road_route_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  waypoints_hash text NOT NULL,
  line jsonb NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, waypoints_hash)
);

GRANT SELECT ON public.road_route_cache TO anon, authenticated;
GRANT ALL ON public.road_route_cache TO service_role;

ALTER TABLE public.road_route_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read of route cache"
  ON public.road_route_cache
  FOR SELECT
  USING (true);

CREATE TRIGGER update_road_route_cache_updated_at
  BEFORE UPDATE ON public.road_route_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_road_route_cache_code ON public.road_route_cache(code);