
-- Convenience views that join each data table with students so that
-- student_number, name, phone_last4 are visible alongside the records.

CREATE OR REPLACE VIEW public.research_chat_view
WITH (security_invoker=on) AS
SELECT s.student_number, s.name, s.phone_last4,
       rc.user_message, rc.assistant_message, rc.created_at,
       rc.id, rc.student_id
FROM public.research_chat rc
LEFT JOIN public.students s ON s.id = rc.student_id;

CREATE OR REPLACE VIEW public.research_memo_view
WITH (security_invoker=on) AS
SELECT s.student_number, s.name, s.phone_last4,
       rm.my_position, rm.my_claim, rm.my_evidence,
       rm.pro_arguments, rm.con_arguments, rm.updated_at,
       rm.id, rm.student_id
FROM public.research_memo rm
LEFT JOIN public.students s ON s.id = rm.student_id;

CREATE OR REPLACE VIEW public.debate_chat_view
WITH (security_invoker=on) AS
SELECT s.student_number, s.name, s.phone_last4,
       ds.stage, ds.student_position,
       dc.user_message, dc.assistant_message, dc.created_at,
       dc.id, dc.session_id, ds.student_id
FROM public.debate_chat dc
LEFT JOIN public.debate_sessions ds ON ds.id = dc.session_id
LEFT JOIN public.students s ON s.id = ds.student_id;

CREATE OR REPLACE VIEW public.debate_sessions_view
WITH (security_invoker=on) AS
SELECT s.student_number, s.name, s.phone_last4,
       ds.stage, ds.student_position, ds.status,
       ds.created_at, ds.ended_at, ds.id, ds.student_id
FROM public.debate_sessions ds
LEFT JOIN public.students s ON s.id = ds.student_id;

CREATE OR REPLACE VIEW public.debate_notes_view
WITH (security_invoker=on) AS
SELECT s.student_number, s.name, s.phone_last4,
       dn.stage, dn.content, dn.updated_at,
       dn.id, dn.student_id
FROM public.debate_notes dn
LEFT JOIN public.students s ON s.id = dn.student_id;

CREATE OR REPLACE VIEW public.reflection_chat_view
WITH (security_invoker=on) AS
SELECT s.student_number, s.name, s.phone_last4,
       rc.stage, rc.user_message, rc.assistant_message, rc.created_at,
       rc.id, rc.student_id
FROM public.reflection_chat rc
LEFT JOIN public.students s ON s.id = rc.student_id;

CREATE OR REPLACE VIEW public.reflection_notes_view
WITH (security_invoker=on) AS
SELECT s.student_number, s.name, s.phone_last4,
       rn.stage, rn.content, rn.updated_at,
       rn.id, rn.student_id
FROM public.reflection_notes rn
LEFT JOIN public.students s ON s.id = rn.student_id;

CREATE OR REPLACE VIEW public.surveys_view
WITH (security_invoker=on) AS
SELECT s.student_number, s.name, s.phone_last4,
       sv.survey_type, sv.responses, sv.created_at,
       sv.id, sv.student_id
FROM public.surveys sv
LEFT JOIN public.students s ON s.id = sv.student_id;

CREATE OR REPLACE VIEW public.final_reports_view
WITH (security_invoker=on) AS
SELECT s.student_number, s.name, s.phone_last4,
       fr.content, fr.updated_at,
       fr.id, fr.student_id
FROM public.final_reports fr
LEFT JOIN public.students s ON s.id = fr.student_id;
