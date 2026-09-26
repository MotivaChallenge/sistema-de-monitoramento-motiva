CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND cmd='SELECT' AND qual='true' AND roles='{authenticated}'
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING (public.has_any_role(auth.uid()))', r.policyname, r.tablename);
  END LOOP;
END $$;