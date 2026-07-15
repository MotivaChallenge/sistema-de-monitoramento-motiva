DROP POLICY "Highways são públicas para leitura" ON public.highways;
CREATE POLICY "Authenticated users can read highways" ON public.highways FOR SELECT TO authenticated USING (true);