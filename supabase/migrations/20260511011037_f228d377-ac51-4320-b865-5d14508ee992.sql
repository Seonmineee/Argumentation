
ALTER TABLE public.research_chat DROP CONSTRAINT IF EXISTS research_messages_role_check;
ALTER TABLE public.research_chat DROP CONSTRAINT IF EXISTS research_chat_role_check;
ALTER TABLE public.reflection_chat DROP CONSTRAINT IF EXISTS reflection_messages_role_check;
ALTER TABLE public.reflection_chat DROP CONSTRAINT IF EXISTS reflection_chat_role_check;
ALTER TABLE public.debate_chat DROP CONSTRAINT IF EXISTS debate_messages_role_check;
ALTER TABLE public.debate_chat DROP CONSTRAINT IF EXISTS debate_chat_role_check;

ALTER TABLE public.research_chat ADD COLUMN IF NOT EXISTS user_message text;
ALTER TABLE public.research_chat ADD COLUMN IF NOT EXISTS assistant_message text;
ALTER TABLE public.reflection_chat ADD COLUMN IF NOT EXISTS user_message text;
ALTER TABLE public.reflection_chat ADD COLUMN IF NOT EXISTS assistant_message text;
ALTER TABLE public.debate_chat ADD COLUMN IF NOT EXISTS user_message text;
ALTER TABLE public.debate_chat ADD COLUMN IF NOT EXISTS assistant_message text;

-- research_chat migration
WITH ordered AS (
  SELECT student_id, role, content, created_at,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at) AS rn
  FROM public.research_chat WHERE role IN ('user','assistant')
),
paired AS (
  SELECT student_id,
    MIN(created_at) AS created_at,
    MAX(CASE WHEN role='user' THEN content END) AS user_message,
    MAX(CASE WHEN role='assistant' THEN content END) AS assistant_message
  FROM ordered
  GROUP BY student_id, ((rn - CASE WHEN role='user' THEN 1 ELSE 2 END) / 2)
)
INSERT INTO public.research_chat (student_id, user_message, assistant_message, role, content, created_at)
SELECT student_id, user_message, assistant_message, 'turn', COALESCE(user_message,''), created_at FROM paired;
DELETE FROM public.research_chat WHERE role IN ('user','assistant');
ALTER TABLE public.research_chat ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.research_chat ALTER COLUMN content DROP NOT NULL;

-- reflection_chat migration
WITH ordered AS (
  SELECT student_id, stage, role, content, created_at,
    ROW_NUMBER() OVER (PARTITION BY student_id, stage ORDER BY created_at) AS rn
  FROM public.reflection_chat WHERE role IN ('user','assistant')
),
paired AS (
  SELECT student_id, stage,
    MIN(created_at) AS created_at,
    MAX(CASE WHEN role='user' THEN content END) AS user_message,
    MAX(CASE WHEN role='assistant' THEN content END) AS assistant_message
  FROM ordered
  GROUP BY student_id, stage, ((rn - CASE WHEN role='user' THEN 1 ELSE 2 END) / 2)
)
INSERT INTO public.reflection_chat (student_id, stage, user_message, assistant_message, role, content, created_at)
SELECT student_id, stage, user_message, assistant_message, 'turn', COALESCE(user_message,''), created_at FROM paired;
DELETE FROM public.reflection_chat WHERE role IN ('user','assistant');
ALTER TABLE public.reflection_chat ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.reflection_chat ALTER COLUMN content DROP NOT NULL;

-- debate_chat migration
WITH ordered AS (
  SELECT session_id, role, content, created_at,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at) AS rn
  FROM public.debate_chat WHERE role IN ('user','assistant')
),
paired AS (
  SELECT session_id,
    MIN(created_at) AS created_at,
    MAX(CASE WHEN role='user' THEN content END) AS user_message,
    MAX(CASE WHEN role='assistant' THEN content END) AS assistant_message
  FROM ordered
  GROUP BY session_id, ((rn - CASE WHEN role='user' THEN 1 ELSE 2 END) / 2)
)
INSERT INTO public.debate_chat (session_id, user_message, assistant_message, role, content, created_at)
SELECT session_id, user_message, assistant_message, 'turn', COALESCE(user_message,''), created_at FROM paired;
DELETE FROM public.debate_chat WHERE role IN ('user','assistant');
ALTER TABLE public.debate_chat ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.debate_chat ALTER COLUMN content DROP NOT NULL;
