
-- Add new columns
ALTER TABLE public.debate_1_chat ADD COLUMN sender text, ADD COLUMN message text;
ALTER TABLE public.debate_2_chat ADD COLUMN sender text, ADD COLUMN message text;

-- Backfill debate_1_chat: split each existing row into up to 2 rows
INSERT INTO public.debate_1_chat (session_id, student_id, student_number, name, phone_last4, sender, message, created_at)
SELECT session_id, student_id, student_number, name, phone_last4, 'user', user_message, created_at
FROM public.debate_1_chat
WHERE sender IS NULL AND user_message IS NOT NULL AND btrim(user_message) <> '';

INSERT INTO public.debate_1_chat (session_id, student_id, student_number, name, phone_last4, sender, message, created_at)
SELECT session_id, student_id, student_number, name, phone_last4, 'ai', assistant_message, created_at + interval '1 millisecond'
FROM public.debate_1_chat
WHERE sender IS NULL AND assistant_message IS NOT NULL AND btrim(assistant_message) <> '';

DELETE FROM public.debate_1_chat WHERE sender IS NULL;

-- Backfill debate_2_chat
INSERT INTO public.debate_2_chat (session_id, student_id, student_number, name, phone_last4, sender, message, created_at)
SELECT session_id, student_id, student_number, name, phone_last4, 'user', user_message, created_at
FROM public.debate_2_chat
WHERE sender IS NULL AND user_message IS NOT NULL AND btrim(user_message) <> '';

INSERT INTO public.debate_2_chat (session_id, student_id, student_number, name, phone_last4, sender, message, created_at)
SELECT session_id, student_id, student_number, name, phone_last4, 'ai', assistant_message, created_at + interval '1 millisecond'
FROM public.debate_2_chat
WHERE sender IS NULL AND assistant_message IS NOT NULL AND btrim(assistant_message) <> '';

DELETE FROM public.debate_2_chat WHERE sender IS NULL;

-- Drop legacy columns
ALTER TABLE public.debate_1_chat
  DROP COLUMN user_message,
  DROP COLUMN assistant_message,
  DROP COLUMN role,
  DROP COLUMN content;

ALTER TABLE public.debate_2_chat
  DROP COLUMN user_message,
  DROP COLUMN assistant_message,
  DROP COLUMN role,
  DROP COLUMN content;

-- Enforce required fields going forward
ALTER TABLE public.debate_1_chat
  ALTER COLUMN sender SET NOT NULL,
  ALTER COLUMN message SET NOT NULL,
  ADD CONSTRAINT debate_1_chat_sender_check CHECK (sender IN ('user','ai'));

ALTER TABLE public.debate_2_chat
  ALTER COLUMN sender SET NOT NULL,
  ALTER COLUMN message SET NOT NULL,
  ADD CONSTRAINT debate_2_chat_sender_check CHECK (sender IN ('user','ai'));
