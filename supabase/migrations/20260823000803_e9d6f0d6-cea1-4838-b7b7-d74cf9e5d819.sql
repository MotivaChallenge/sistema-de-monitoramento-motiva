CREATE OR REPLACE FUNCTION public.notify_on_work_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  title_text text;
  body_text text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    title_text := 'Nova ordem de serviço criada';
    body_text := 'OS ' || NEW.code || ' foi criada com prioridade ' || NEW.priority;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    title_text := 'Ordem de serviço atualizada';
    body_text := 'OS ' || NEW.code || ' mudou de status ' || OLD.status || ' para ' || NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, entity, entity_id)
  SELECT id, title_text, body_text, 'work_order', 'work_orders', NEW.id::text
  FROM auth.users;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_on_work_order_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_work_order_change() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_on_work_order_change() TO service_role, postgres;

CREATE TRIGGER trg_notify_on_work_order_change
AFTER INSERT OR UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_work_order_change();