DROP VIEW IF EXISTS public.debate_sessions_view;
DROP VIEW IF EXISTS public.debate_chat_view;

CREATE VIEW public.debate_sessions_view
WITH (security_invoker=on) AS
SELECT
  s.student_number,
  s.name,
  s.phone_last4,
  d.stage,
  d.student_position,
  CASE d.student_position WHEN 'pro' THEN '찬성' WHEN 'con' THEN '반대' ELSE d.student_position END AS student_position_kr,
  CASE d.student_position WHEN 'pro' THEN '반대' WHEN 'con' THEN '찬성' ELSE NULL END AS ai_position_kr,
  d.status,
  d.created_at,
  d.ended_at,
  d.id AS session_id,
  d.student_id
FROM public.debate_sessions d
LEFT JOIN public.students s ON s.id = d.student_id;

CREATE VIEW public.debate_chat_view
WITH (security_invoker=on) AS
SELECT
  s.student_number,
  s.name,
  s.phone_last4,
  ds.stage,
  CASE ds.student_position WHEN 'pro' THEN '찬성' WHEN 'con' THEN '반대' ELSE ds.student_position END AS student_position_kr,
  CASE ds.student_position WHEN 'pro' THEN '반대' WHEN 'con' THEN '찬성' ELSE NULL END AS ai_position_kr,
  c.user_message,
  c.assistant_message,
  c.created_at,
  c.id,
  c.session_id,
  ds.student_id
FROM public.debate_chat c
LEFT JOIN public.debate_sessions ds ON ds.id = c.session_id
LEFT JOIN public.students s ON s.id = ds.student_id;