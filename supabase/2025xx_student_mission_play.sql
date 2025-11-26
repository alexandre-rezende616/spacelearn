-- 2025xx_student_mission_play.sql
-- Funções para carregar conteúdo da missão e registrar respostas via RPC seguro.

BEGIN;

CREATE OR REPLACE FUNCTION public.student_fetch_mission_content(p_mission_id uuid)
RETURNS TABLE(question_id uuid, prompt text, order_index integer, option_id uuid, option_text text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.';
  END IF;

  PERFORM 1
  FROM public.mission_classes mc
  JOIN public.enrollments e ON e.class_id = mc.class_id
  WHERE mc.mission_id = p_mission_id
    AND e.student_id = auth.uid()
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Missão indisponível para este aluno.';
  END IF;

  RETURN QUERY
  SELECT q.id, q.prompt, q.order_index, o.id, o.text
  FROM public.mission_questions q
  LEFT JOIN public.mission_options o ON o.question_id = q.id
  WHERE q.mission_id = p_mission_id
  ORDER BY q.order_index, o.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_submit_mission_answer(
  p_mission_id uuid,
  p_question_id uuid,
  p_option_id uuid,
  p_current_correct integer,
  p_total_questions integer,
  p_completed boolean
)
RETURNS TABLE(
  is_correct boolean,
  next_correct integer,
  total_questions integer,
  completed boolean,
  delta_xp integer,
  delta_coins integer,
  prev_mission_correct integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student uuid := auth.uid();
  v_chosen_correct boolean;
  v_prev_correct integer := 0;
  v_prev_xp integer := 0;
  v_prev_coins integer := 0;
  v_next_correct integer;
  v_xp integer := 0;
  v_coins integer := 0;
  v_delta_xp integer := 0;
  v_delta_coins integer := 0;
  v_total_questions integer := 0;
  v_answered_questions integer := 0;
  v_completed boolean := false;
  v_attempt_limit integer := NULL;
  v_attempt_count integer := 0;
  v_class_id uuid;
BEGIN
  IF v_student IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.';
  END IF;

  PERFORM 1
  FROM public.mission_classes mc
  JOIN public.enrollments e ON e.class_id = mc.class_id
  WHERE mc.mission_id = p_mission_id
    AND e.student_id = v_student
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Missão indisponível para este aluno.';
  END IF;

  PERFORM 1
  FROM public.mission_questions q
  WHERE q.id = p_question_id
    AND q.mission_id = p_mission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pergunta inválida para esta missão.';
  END IF;

  -- Determina se a alternativa escolhida é correta
  SELECT mo.is_correct INTO v_chosen_correct
  FROM public.mission_options mo
  WHERE mo.id = p_option_id
    AND mo.question_id = p_question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alternativa inválida para esta pergunta.';
  END IF;

  -- Busca turma alvo para verificar limite configurado
  SELECT mc.class_id, mc.max_attempts_per_question
  INTO v_class_id, v_attempt_limit
  FROM public.mission_classes mc
  JOIN public.enrollments e ON e.class_id = mc.class_id
  WHERE mc.mission_id = p_mission_id
    AND e.student_id = v_student
  LIMIT 1;

  IF v_attempt_limit IS NOT NULL THEN
  SELECT COUNT(*) INTO v_attempt_count
    FROM public.attempts a
    WHERE a.mission_id = p_mission_id
      AND a.question_id = p_question_id
      AND a.student_id = v_student;

    IF v_attempt_count >= v_attempt_limit THEN
      RAISE EXCEPTION 'Limite de tentativas atingido para esta pergunta.';
    END IF;
  END IF;

  INSERT INTO public.attempts (mission_id, question_id, student_id, selected_option_id, is_correct)
  VALUES (p_mission_id, p_question_id, v_student, p_option_id, v_chosen_correct);

  SELECT correct_count, xp_awarded, coins_awarded
  INTO v_prev_correct, v_prev_xp, v_prev_coins
  FROM public.progress
  WHERE mission_id = p_mission_id AND student_id = v_student
  FOR UPDATE;
  IF NOT FOUND THEN
    v_prev_correct := 0;
    v_prev_xp := 0;
    v_prev_coins := 0;
  END IF;

  -- Recalcula totais com base nas melhores tentativas por pergunta
  SELECT COUNT(*) INTO v_total_questions FROM public.mission_questions WHERE mission_id = p_mission_id;
  WITH best AS (
    SELECT question_id, BOOL_OR(COALESCE(a.is_correct, false)) AS got_it
    FROM public.attempts a
    WHERE a.mission_id = p_mission_id AND a.student_id = v_student
    GROUP BY question_id
  )
  SELECT COUNT(*) INTO v_answered_questions FROM best;

  WITH best AS (
    SELECT question_id, BOOL_OR(COALESCE(a.is_correct, false)) AS got_it
    FROM public.attempts a
    WHERE a.mission_id = p_mission_id AND a.student_id = v_student
    GROUP BY question_id
  )
  SELECT COUNT(*) INTO v_next_correct FROM best WHERE got_it = true;

  v_completed := p_completed OR (v_answered_questions >= v_total_questions AND v_total_questions > 0);

  IF v_completed THEN
    v_xp := v_next_correct * 10;
    v_coins := v_next_correct * 5;
  ELSE
    v_xp := COALESCE(v_prev_xp, 0);
    v_coins := COALESCE(v_prev_coins, 0);
  END IF;

  INSERT INTO public.progress (mission_id, student_id, correct_count, total_count, completed, xp_awarded, coins_awarded)
  VALUES (p_mission_id, v_student, v_next_correct, v_total_questions, v_completed, v_xp, v_coins)
  ON CONFLICT (mission_id, student_id)
  DO UPDATE SET
    correct_count = EXCLUDED.correct_count,
    total_count = EXCLUDED.total_count,
    completed = EXCLUDED.completed,
    xp_awarded = EXCLUDED.xp_awarded,
    coins_awarded = EXCLUDED.coins_awarded;

  v_delta_xp := v_xp - COALESCE(v_prev_xp, 0);
  v_delta_coins := v_coins - COALESCE(v_prev_coins, 0);

  IF v_delta_xp <> 0 OR v_delta_coins <> 0 THEN
    UPDATE public.profiles
    SET xp_total = GREATEST(0, COALESCE(xp_total, 0) + v_delta_xp),
        coins_balance = GREATEST(0, COALESCE(coins_balance, 0) + v_delta_coins)
    WHERE id = v_student;
  END IF;

  RETURN QUERY
  SELECT v_chosen_correct, v_next_correct, v_total_questions, v_completed, v_delta_xp, v_delta_coins, COALESCE(v_prev_correct, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_fetch_mission_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_submit_mission_answer(uuid, uuid, uuid, integer, integer, boolean) TO authenticated;

COMMIT;

-- Rollback
-- BEGIN;
-- REVOKE EXECUTE ON FUNCTION public.student_fetch_mission_content(uuid) FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.student_submit_mission_answer(uuid, uuid, uuid, integer, integer, boolean) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.student_submit_mission_answer(uuid, uuid, uuid, integer, integer, boolean);
-- DROP FUNCTION IF EXISTS public.student_fetch_mission_content(uuid);
-- COMMIT;
