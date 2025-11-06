-- 2025xx_rls_classes_enrollments.sql
-- Idempotent script to enable RLS and create safe policies for public.classes and public.enrollments
-- Also creates helpful indexes and includes rollback statements in comments.
-- Run as a privileged DB user (service_role) or via Supabase SQL editor.

BEGIN;

-- 1) Enable RLS (safe to run repeatedly)
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;

-- 2) Drop any old policies if present (idempotent)
DROP POLICY IF EXISTS classes_owner_select ON public.classes;
DROP POLICY IF EXISTS classes_owner_modify ON public.classes;

DROP POLICY IF EXISTS enrollments_student_select ON public.enrollments;
DROP POLICY IF EXISTS enrollments_student_insert ON public.enrollments;
DROP POLICY IF EXISTS enrollments_student_delete ON public.enrollments;
DROP POLICY IF EXISTS enrollments_teacher_select ON public.enrollments;
DROP POLICY IF EXISTS enrollments_teacher_delete ON public.enrollments;

-- 3) Create safe, simple policies
-- Classes: professor (authenticated) can see and modify only rows where teacher_id = auth.uid()
CREATE POLICY classes_owner_select ON public.classes
  FOR SELECT
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()));

CREATE POLICY classes_owner_modify ON public.classes
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- Explanation:
-- - These policies examine only the current row's teacher_id compared to auth.uid().
-- - They do NOT query enrollments, avoiding cyclic dependencies.

-- Enrollments: student access (student_id = auth.uid())
CREATE POLICY enrollments_student_select ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (student_id = (SELECT auth.uid()));

CREATE POLICY enrollments_student_insert ON public.enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE POLICY enrollments_student_delete ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (student_id = (SELECT auth.uid()));

-- Enrollments: teacher access to enrollments in their classes
-- This policy uses a direct EXISTS check against public.classes to confirm the teacher owns the class.
-- Note: classes' policy does not reference enrollments, so this does not form a recursion cycle.
CREATE POLICY enrollments_teacher_select ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY enrollments_teacher_delete ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

-- 4) Create helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON public.enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);

COMMIT;

-- -------------------------------------------------------------------
-- Quick verification queries (run as the appropriate authenticated user via Supabase API or PostgREST with JWT)
-- Replace <PROFESSOR_UUID>, <ALUNO_UUID> and <CLASS_UUID> when testing in psql if simulating.

-- Professor should only see their classes:
-- SELECT * FROM public.classes WHERE teacher_id = '<PROFESSOR_UUID>';

-- Professor should only see enrollments in their classes:
-- SELECT e.* FROM public.enrollments e JOIN public.classes c ON c.id = e.class_id WHERE c.teacher_id = '<PROFESSOR_UUID>';

-- Student should only see their enrollments:
-- SELECT * FROM public.enrollments WHERE student_id = '<ALUNO_UUID>';

-- Student should only insert their own enrollment:
-- INSERT INTO public.enrollments (class_id, student_id) VALUES ('<CLASS_UUID>', '<ALUNO_UUID>');

-- -------------------------------------------------------------------
-- Rollback / revert commands (if you need to undo the policy changes)
-- NOTE: This disables RLS and removes policies. Use with caution.

-- BEGIN;
-- DROP POLICY IF EXISTS classes_owner_select ON public.classes;
-- DROP POLICY IF EXISTS classes_owner_modify ON public.classes;
-- DROP POLICY IF EXISTS enrollments_student_select ON public.enrollments;
-- DROP POLICY IF EXISTS enrollments_student_insert ON public.enrollments;
-- DROP POLICY IF EXISTS enrollments_student_delete ON public.enrollments;
-- DROP POLICY IF EXISTS enrollments_teacher_select ON public.enrollments;
-- DROP POLICY IF EXISTS enrollments_teacher_delete ON public.enrollments;
-- ALTER TABLE IF EXISTS public.classes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.enrollments DISABLE ROW LEVEL SECURITY;
-- COMMIT;
