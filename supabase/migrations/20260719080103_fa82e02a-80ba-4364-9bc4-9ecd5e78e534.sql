
ALTER TABLE public.final_reports
  ADD COLUMN IF NOT EXISTS student_number text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS phone_last4 text;

UPDATE public.final_reports fr
SET student_number = s.student_number,
    name = s.name,
    phone_last4 = s.phone_last4
FROM public.students s
WHERE fr.student_id = s.id;

CREATE OR REPLACE FUNCTION public.fill_final_report_student_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT student_number, phone_last4, name
    INTO NEW.student_number, NEW.phone_last4, NEW.name
  FROM public.students
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fill_final_report_student_info_trg ON public.final_reports;
CREATE TRIGGER fill_final_report_student_info_trg
BEFORE INSERT OR UPDATE OF student_id ON public.final_reports
FOR EACH ROW EXECUTE FUNCTION public.fill_final_report_student_info();
