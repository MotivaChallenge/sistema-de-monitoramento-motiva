CREATE OR REPLACE FUNCTION public.notify_on_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, entity, entity_id)
  SELECT id,
         CASE NEW.status
           WHEN 'critico' THEN 'Novo alerta crítico'
           WHEN 'atencao' THEN 'Novo alerta de atenção'
           ELSE 'Novo alerta'
         END,
         COALESCE(NEW.message, 'Trecho ' || NEW.segment_id || ' mudou para status ' || NEW.status),
         'alert',
         'alerts',
         NEW.id::text
  FROM auth.users;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_alert
AFTER INSERT ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_alert();