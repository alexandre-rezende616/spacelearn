-- 2025xx_classes_student_access.sql
-- Permite alunos visualizarem dados das turmas em que estão matriculados, sem quebrar as políticas existentes.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_is_student_enrolled_in_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.class_id = target_class_id
      AND e.student_id = (SELECT auth.uid())
  );
$$;

DROP POLICY IF EXISTS classes_student_select ON public.classes;
CREATE POLICY classes_student_select ON public.classes
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    OR fn_is_student_enrolled_in_class(id)
  );

COMMIT;

-- Rollback
-- BEGIN;
-- DROP POLICY IF EXISTS classes_student_select ON public.classes;
-- DROP FUNCTION IF EXISTS public.fn_is_student_enrolled_in_class(uuid);
-- COMMIT;
