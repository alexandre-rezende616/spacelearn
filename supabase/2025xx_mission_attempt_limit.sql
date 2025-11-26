-- 2025xx_mission_attempt_limit.sql
-- Adiciona limite opcional de tentativas por pergunta para cada missão/turma.

BEGIN;

ALTER TABLE IF EXISTS public.mission_classes
  ADD COLUMN IF NOT EXISTS max_attempts_per_question integer NULL CHECK (max_attempts_per_question > 0);

COMMIT;

-- Rollback
-- BEGIN;
-- ALTER TABLE IF EXISTS public.mission_classes DROP COLUMN IF EXISTS max_attempts_per_question;
-- COMMIT;
