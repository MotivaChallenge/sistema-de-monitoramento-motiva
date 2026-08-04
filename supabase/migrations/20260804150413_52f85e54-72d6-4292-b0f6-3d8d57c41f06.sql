DROP POLICY IF EXISTS "Public read of route cache" ON public.road_route_cache;
REVOKE SELECT ON public.road_route_cache FROM anon;