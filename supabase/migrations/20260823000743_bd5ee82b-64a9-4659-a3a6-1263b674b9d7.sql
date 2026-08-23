REVOKE EXECUTE ON FUNCTION public.notify_on_alert() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_on_alert() TO service_role;