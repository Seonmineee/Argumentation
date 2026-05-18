
-- 1) Drop existing views that depend on old tables
DROP VIEW IF EXISTS public.research_chat_view;
DROP VIEW IF EXISTS public.debate_chat_view;
DROP VIEW IF EXISTS public.reflection_chat_view;

-- 2) Create new research_chat with student info columns
CREATE TABLE public.research_chat_new (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  student_number text,
  name text,
  phone_last4 text,
  user_message text,
  assistant_message text,
  role text,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.research_chat_new
  (id, student_id, student_number, name, phone_last4, user_message, assistant_message, role, content, created_at)
SELECT r.id, r.student_id, s.student_number, s.name, s.phone_last4,
       r.user_message, r.assistant_message, r.role, r.content, r.created_at
FROM public.research_chat r
LEFT JOIN public.students s ON s.id = r.student_id;

DROP TABLE public.research_chat;
ALTER TABLE public.research_chat_new RENAME TO research_chat;

ALTER TABLE public.research_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.research_chat FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_research_chat_student ON public.research_chat(student_id, created_at);

-- 3) Create debate_1_chat (stage 3) and debate_2_chat (stage 4)
CREATE TABLE public.debate_1_chat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_number text,
  name text,
  phone_last4 text,
  user_message text,
  assistant_message text,
  role text,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.debate_2_chat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_number text,
  name text,
  phone_last4 text,
  user_message text,
  assistant_message text,
  role text,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.debate_1_chat
  (id, session_id, student_id, student_number, name, phone_last4, user_message, assistant_message, role, content, created_at)
SELECT d.id, d.session_id, ds.student_id, s.student_number, s.name, s.phone_last4,
       d.user_message, d.assistant_message, d.role, d.content, d.created_at
FROM public.debate_chat d
JOIN public.debate_sessions ds ON ds.id = d.session_id
LEFT JOIN public.students s ON s.id = ds.student_id
WHERE ds.stage = 3;

INSERT INTO public.debate_2_chat
  (id, session_id, student_id, student_number, name, phone_last4, user_message, assistant_message, role, content, created_at)
SELECT d.id, d.session_id, ds.student_id, s.student_number, s.name, s.phone_last4,
       d.user_message, d.assistant_message, d.role, d.content, d.created_at
FROM public.debate_chat d
JOIN public.debate_sessions ds ON ds.id = d.session_id
LEFT JOIN public.students s ON s.id = ds.student_id
WHERE ds.stage = 4;

DROP TABLE public.debate_chat;

ALTER TABLE public.debate_1_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_2_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.debate_1_chat FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.debate_2_chat FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_debate_1_chat_session ON public.debate_1_chat(session_id, created_at);
CREATE INDEX idx_debate_1_chat_student ON public.debate_1_chat(student_id, created_at);
CREATE INDEX idx_debate_2_chat_session ON public.debate_2_chat(session_id, created_at);
CREATE INDEX idx_debate_2_chat_student ON public.debate_2_chat(student_id, created_at);

-- 4) Create reflection_1_chat / reflection_2_chat
CREATE TABLE public.reflection_1_chat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  student_number text,
  name text,
  phone_last4 text,
  user_message text,
  assistant_message text,
  role text,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reflection_2_chat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  student_number text,
  name text,
  phone_last4 text,
  user_message text,
  assistant_message text,
  role text,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.reflection_1_chat
  (id, student_id, student_number, name, phone_last4, user_message, assistant_message, role, content, created_at)
SELECT r.id, r.student_id, s.student_number, s.name, s.phone_last4,
       r.user_message, r.assistant_message, r.role, r.content, r.created_at
FROM public.reflection_chat r
LEFT JOIN public.students s ON s.id = r.student_id
WHERE r.stage = 3;

INSERT INTO public.reflection_2_chat
  (id, student_id, student_number, name, phone_last4, user_message, assistant_message, role, content, created_at)
SELECT r.id, r.student_id, s.student_number, s.name, s.phone_last4,
       r.user_message, r.assistant_message, r.role, r.content, r.created_at
FROM public.reflection_chat r
LEFT JOIN public.students s ON s.id = r.student_id
WHERE r.stage = 4;

DROP TABLE public.reflection_chat;

ALTER TABLE public.reflection_1_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflection_2_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.reflection_1_chat FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.reflection_2_chat FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_reflection_1_chat_student ON public.reflection_1_chat(student_id, created_at);
CREATE INDEX idx_reflection_2_chat_student ON public.reflection_2_chat(student_id, created_at);
