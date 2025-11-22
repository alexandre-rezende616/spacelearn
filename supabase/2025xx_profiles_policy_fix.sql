-- 2025xx_profiles_policy_fix.sql
-- Separa as permissões de leitura/escrita de perfis usando funções SECURITY DEFINER
-- para evitar recursão com public.enrollments.

BEGIN;

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_teacher_students ON public.profiles;
DROP POLICY IF EXISTS profiles_self_manage ON public.profiles;

CREATE OR REPLACE FUNCTION public.fn_can_teacher_view_student(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.classes c ON c.id = e.class_id
    WHERE e.student_id = target_profile_id
      AND c.teacher_id = (SELECT auth.uid())
  );
$$;

CREATE POLICY profiles_self_manage ON public.profiles
  FOR ALL
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_teacher_students ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()) OR fn_can_teacher_view_student(id));

COMMIT;

-- Rollback
-- BEGIN;
-- DROP POLICY IF EXISTS profiles_teacher_students ON public.profiles;
-- DROP POLICY IF EXISTS profiles_self_manage ON public.profiles;
-- DROP FUNCTION IF EXISTS public.fn_can_teacher_view_student(uuid);
-- COMMIT;
