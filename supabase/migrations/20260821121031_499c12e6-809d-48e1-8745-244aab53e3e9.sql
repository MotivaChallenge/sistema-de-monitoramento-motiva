-- 1. Espaço interno, não exposto pela API, para funções de verificação de papel
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Reaponta todas as policies existentes para private.has_role
DO $do$
DECLARE
  p RECORD;
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE (qual LIKE '%has_role(%' OR with_check LIKE '%has_role(%')
  LOOP
    new_qual := replace(coalesce(p.qual, ''), 'has_role(', 'private.has_role(');
    new_check := replace(coalesce(p.with_check, ''), 'has_role(', 'private.has_role(');
    new_qual := replace(new_qual, 'private.private.', 'private.');
    new_check := replace(new_check, 'private.private.', 'private.');

    stmt := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF p.qual IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;
    IF p.with_check IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;
    EXECUTE stmt;
  END LOOP;
END
$do$;

-- 3. Remove a versão exposta pela API
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 4. Auditoria legível somente por administradores
DROP POLICY IF EXISTS audit_log_select_authenticated ON public.audit_log;
CREATE POLICY "audit_log_select_admins"
ON public.audit_log
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));