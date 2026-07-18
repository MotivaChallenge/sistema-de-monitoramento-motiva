DROP POLICY IF EXISTS "Anyone can read route cache" ON public.road_route_cache;
DROP POLICY IF EXISTS "Public can read route cache" ON public.road_route_cache;
DROP POLICY IF EXISTS "public read road_route_cache" ON public.road_route_cache;
DROP POLICY IF EXISTS "road_route_cache_public_read" ON public.road_route_cache;

REVOKE SELECT ON public.road_route_cache FROM anon, PUBLIC;
GRANT SELECT ON public.road_route_cache TO authenticated;

CREATE POLICY "Authenticated users can read route cache"
ON public.road_route_cache
FOR SELECT
TO authenticated
USING (true);