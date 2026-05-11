CREATE TABLE public.research_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.research_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.research_messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_research_messages_student ON public.research_messages(student_id, created_at);