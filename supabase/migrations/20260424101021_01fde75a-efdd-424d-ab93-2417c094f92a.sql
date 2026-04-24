
-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number TEXT NOT NULL,
  phone_last4 TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_number, phone_last4)
);

-- Surveys (pre/post)
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('pre','post')),
  responses JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, survey_type)
);

-- Stage 2 research
CREATE TABLE public.stage2_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  pro_arguments TEXT,
  con_arguments TEXT,
  my_position TEXT,
  my_claim TEXT,
  my_evidence TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Debate sessions (stage 3 = student pro, stage 4 = student con)
CREATE TABLE public.debate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  stage INT NOT NULL CHECK (stage IN (3,4)),
  student_position TEXT NOT NULL CHECK (student_position IN ('pro','con')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  UNIQUE(student_id, stage)
);

-- Debate messages
CREATE TABLE public.debate_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.debate_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debate_messages_session ON public.debate_messages(session_id, created_at);

-- Reflection sessions implicit via stage; messages reference student + stage
CREATE TABLE public.reflection_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  stage INT NOT NULL CHECK (stage IN (3,4)),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reflection_messages_student_stage ON public.reflection_messages(student_id, stage, created_at);

-- Final report
CREATE TABLE public.final_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage2_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflection_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_reports ENABLE ROW LEVEL SECURITY;

-- Open policies (no Supabase Auth; identification via student_number + phone_last4)
CREATE POLICY "open all" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.surveys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.stage2_research FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.debate_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.debate_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.reflection_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.final_reports FOR ALL USING (true) WITH CHECK (true);
