-- 2025xx_medals.sql
-- Cria tabela de medalhas vinculada ao professor e políticas RLS básicas.
-- Execute com uma role privilegiada (p.ex. service_role) no Supabase.

BEGIN;

CREATE TABLE IF NOT EXISTS public.medals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  required_correct integer NOT NULL CHECK (required_correct > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medals_select_all ON public.medals;
DROP POLICY IF EXISTS medals_teacher_all ON public.medals;

-- Qualquer usuário autenticado pode listar medalhas (alunos precisam ver metas).
CREATE POLICY medals_select_all ON public.medals
  FOR SELECT
  TO authenticated
  USING (true);

-- Professores só podem inserir/editar/remover as próprias medalhas.
CREATE POLICY medals_teacher_all ON public.medals
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_medals_teacher_id ON public.medals(teacher_id);
CREATE INDEX IF NOT EXISTS idx_medals_required_correct ON public.medals(required_correct);

COMMIT;

-- -------------------------------------------------------------------
-- Rollback (caso precise remover a feature)
-- BEGIN;
-- DROP POLICY IF EXISTS medals_select_all ON public.medals;
-- DROP POLICY IF EXISTS medals_teacher_all ON public.medals;
-- DROP TABLE IF EXISTS public.medals;
-- COMMIT;
