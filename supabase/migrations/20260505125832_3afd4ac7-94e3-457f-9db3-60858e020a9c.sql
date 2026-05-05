-- Sprint 4: tighten RLS on user_roles and profiles
-- Restrict role visibility to own roles + admins
DROP POLICY IF EXISTS "Roles viewable by authenticated users" ON public.user_roles;
CREATE POLICY "Users view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Restrict profiles visibility to own profile + admins
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));