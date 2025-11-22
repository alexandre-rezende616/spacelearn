-- 2025xx_mission_student_access.sql
-- Garante que alunos, professores e coordenadores enxerguem apenas o conteúdo liberado,
-- evitando recursão entre tabelas com RLS por meio de funções SECURITY DEFINER.

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

-- Funções auxiliares (SECURITY DEFINER) para evitar ciclos de RLS -------------------
CREATE OR REPLACE FUNCTION public.fn_is_teacher_of_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = target_class_id
      AND c.teacher_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_student_of_class(target_class_id uuid)
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

CREATE OR REPLACE FUNCTION public.fn_is_student_assigned_to_mission(target_mission_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mission_classes mc
    JOIN public.enrollments e ON e.class_id = mc.class_id
    WHERE mc.mission_id = target_mission_id
      AND e.student_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_student_allowed_for_question(target_question_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mission_questions q
    JOIN public.mission_classes mc ON mc.mission_id = q.mission_id
    JOIN public.enrollments e ON e.class_id = mc.class_id
    WHERE q.id = target_question_id
      AND e.student_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('professor', 'coordenador')
  );
$$;

-- Políticas reescritas usando as funções -------------------------------------------

CREATE POLICY mission_classes_teacher_select ON public.mission_classes
  FOR SELECT
  TO authenticated
  USING (fn_is_teacher_of_class(class_id));

CREATE POLICY mission_classes_student_select ON public.mission_classes
  FOR SELECT
  TO authenticated
  USING (fn_is_student_of_class(class_id));

CREATE POLICY mission_questions_assigned_students ON public.mission_questions
  FOR SELECT
  TO authenticated
  USING (fn_is_student_assigned_to_mission(mission_questions.mission_id) OR fn_is_staff());

CREATE POLICY mission_questions_staff ON public.mission_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (fn_is_staff());

CREATE POLICY mission_options_assigned_students ON public.mission_options
  FOR SELECT
  TO authenticated
  USING (fn_is_student_allowed_for_question(mission_options.question_id) OR fn_is_staff());

CREATE POLICY mission_options_staff ON public.mission_options
  FOR INSERT
  TO authenticated
  WITH CHECK (fn_is_staff());

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
-- DROP FUNCTION IF EXISTS public.fn_is_teacher_of_class(uuid);
-- DROP FUNCTION IF EXISTS public.fn_is_student_of_class(uuid);
-- DROP FUNCTION IF EXISTS public.fn_is_student_assigned_to_mission(uuid);
-- DROP FUNCTION IF EXISTS public.fn_is_student_allowed_for_question(uuid);
-- DROP FUNCTION IF EXISTS public.fn_is_staff();
-- COMMIT;
