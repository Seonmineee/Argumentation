CREATE POLICY "Public delete debate_notes" ON public.debate_notes FOR DELETE USING (true);
CREATE POLICY "Public delete reflection_notes" ON public.reflection_notes FOR DELETE USING (true);