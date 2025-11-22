-- 2025xx_cleanup_classes_enrollments.sql
-- Remove legacy policies that referenced functions/tables recursively and recreate the minimal safe set.

BEGIN;

ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'classes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.classes;', pol.policyname);
  END LOOP;
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enrollments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.enrollments;', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY classes_owner_select ON public.classes
  FOR SELECT
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()));

CREATE POLICY classes_owner_all ON public.classes
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

CREATE POLICY enrollments_student_all ON public.enrollments
  FOR ALL
  TO authenticated
  USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE POLICY enrollments_teacher_select ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = enrollments.class_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY enrollments_teacher_delete ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = enrollments.class_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

COMMIT;

-- Rollback
-- BEGIN;
-- DO $$
-- DECLARE pol record;
-- BEGIN
--   FOR pol IN
--     SELECT policyname
--     FROM pg_policies
--     WHERE schemaname = 'public' AND tablename IN ('classes','enrollments')
--   LOOP
--     EXECUTE format('DROP POLICY IF EXISTS %I ON public.%s;', pol.policyname, CASE WHEN pol.tablename='classes' THEN 'classes' ELSE 'enrollments' END);
--   END LOOP;
-- END $$;
-- COMMIT;
