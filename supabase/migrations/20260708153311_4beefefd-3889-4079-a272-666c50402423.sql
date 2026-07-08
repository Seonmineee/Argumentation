
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS student_number text,
  ADD COLUMN IF NOT EXISTS phone_last4 text,
  ADD COLUMN IF NOT EXISTS name text;

UPDATE public.surveys s
SET student_number = st.student_number,
    phone_last4 = st.phone_last4,
    name = st.name
FROM public.students st
WHERE s.student_id = st.id;

CREATE OR REPLACE FUNCTION public.fill_survey_student_info()
RETURNS TRIGGER AS $$
BEGIN
  SELECT student_number, phone_last4, name
    INTO NEW.student_number, NEW.phone_last4, NEW.name
  FROM public.students
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_fill_survey_student_info ON public.surveys;
CREATE TRIGGER trg_fill_survey_student_info
  BEFORE INSERT OR UPDATE OF student_id ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.fill_survey_student_info();
