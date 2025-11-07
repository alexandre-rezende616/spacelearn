-- 2025xx_mission_student_access.sql
-- Garante que alunos e professores possam enxergar perguntas/opções das missões atribuídas.

BEGIN;

ALTER TABLE IF EXISTS public.mission_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mission_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mission_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mission_classes_teacher_select ON public.mission_classes;
DROP POLICY IF EXISTS mission_classes_student_select ON public.mission_classes;
DROP POLICY IF EXISTS mission_questions_assigned_students ON public.mission_questions;
DROP POLICY IF EXISTS mission_questions_staff ON public.mission_questions;
DROP POLICY IF EXISTS mission_options_assigned_students ON public.mission_options;
DROP POLICY IF EXISTS mission_options_staff ON public.mission_options;
DROP POLICY IF EXISTS profiles_teacher_students ON public.profiles;

-- Professores veem missões atribuidas às próprias turmas
CREATE POLICY mission_classes_teacher_select ON public.mission_classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = mission_classes.class_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

-- Alunos veem missões das turmas em que estão matriculados
CREATE POLICY mission_classes_student_select ON public.mission_classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.class_id = mission_classes.class_id
        AND e.student_id = (SELECT auth.uid())
    )
  );

-- Alunos enxergam perguntas da missão vinculada a alguma turma onde estão matriculados
CREATE POLICY mission_questions_assigned_students ON public.mission_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.mission_classes mc
      JOIN public.enrollments e ON e.class_id = mc.class_id
      WHERE mc.mission_id = mission_questions.mission_id
        AND e.student_id = (SELECT auth.uid())
    )
  );

-- Professores e coordenadores leem qualquer pergunta
CREATE POLICY mission_questions_staff ON public.mission_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('professor', 'coordenador')
    )
  );

CREATE POLICY mission_options_assigned_students ON public.mission_options
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.mission_classes mc
      JOIN public.enrollments e ON e.class_id = mc.class_id
      JOIN public.mission_questions q ON q.id = mission_options.question_id
      WHERE mc.mission_id = q.mission_id
        AND e.student_id = (SELECT auth.uid())
    )
  );

CREATE POLICY mission_options_staff ON public.mission_options
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('professor', 'coordenador')
    )
  );

-- Professores podem ver nome/ID dos alunos matriculados nas suas turmas
CREATE POLICY profiles_teacher_students ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.classes c ON c.id = e.class_id
      WHERE e.student_id = public.profiles.id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

COMMIT;

-- -------------------------------------------------------------------
-- Rollback
-- BEGIN;
-- DROP POLICY IF EXISTS mission_classes_teacher_select ON public.mission_classes;
-- DROP POLICY IF EXISTS mission_classes_student_select ON public.mission_classes;
-- DROP POLICY IF EXISTS mission_questions_assigned_students ON public.mission_questions;
-- DROP POLICY IF EXISTS mission_questions_staff ON public.mission_questions;
-- DROP POLICY IF EXISTS mission_options_assigned_students ON public.mission_options;
-- DROP POLICY IF EXISTS mission_options_staff ON public.mission_options;
-- DROP POLICY IF EXISTS profiles_teacher_students ON public.profiles;
-- COMMIT;
