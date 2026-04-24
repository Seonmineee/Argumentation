CREATE TABLE IF NOT EXISTS public.debate_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, stage)
);
ALTER TABLE public.debate_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read debate_notes" ON public.debate_notes FOR SELECT USING (true);
CREATE POLICY "Public insert debate_notes" ON public.debate_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update debate_notes" ON public.debate_notes FOR UPDATE USING (true);