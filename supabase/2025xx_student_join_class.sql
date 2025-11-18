-- 2025xx_student_join_class.sql
-- Função para o aluno entrar em uma turma pelo código sem depender de SELECT direto em classes.

BEGIN;

CREATE OR REPLACE FUNCTION public.student_join_class_by_code(p_code text)
RETURNS TABLE(id uuid, name text, code text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_class record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.';
  END IF;

  SELECT c.id, c.name, c.code, c.created_at
  INTO target_class
  FROM public.classes c
  WHERE upper(c.code) = upper(trim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma não encontrada para este código.';
  END IF;

  INSERT INTO public.enrollments(class_id, student_id)
  VALUES (target_class.id, auth.uid())
  ON CONFLICT (class_id, student_id) DO NOTHING;

  RETURN QUERY SELECT target_class.id, target_class.name, target_class.code, target_class.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_join_class_by_code(text) TO authenticated;

COMMIT;

-- Rollback
-- BEGIN;
-- REVOKE EXECUTE ON FUNCTION public.student_join_class_by_code(text) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.student_join_class_by_code(text);
-- COMMIT;
