-- Backup: policies for class_messages
DROP POLICY IF EXISTS aluno_vê_mensagens ON public.class_messages;
CREATE POLICY aluno_vê_mensagens ON public.class_messages FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM enrollments e
      WHERE ((e.class_id = class_messages.class_id) AND (e.student_id = auth.uid()))))
  );

DROP POLICY IF EXISTS class_messages_prof_manage ON public.class_messages;
CREATE POLICY class_messages_prof_manage ON public.class_messages FOR ALL
  USING (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = class_messages.class_id) AND (c.teacher_id = auth.uid()))))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = class_messages.class_id) AND (c.teacher_id = auth.uid()))))
  );

DROP POLICY IF EXISTS class_messages_student_view ON public.class_messages;
CREATE POLICY class_messages_student_view ON public.class_messages FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM enrollments e
      WHERE ((e.class_id = class_messages.class_id) AND (e.student_id = auth.uid()))))
  );

DROP POLICY IF EXISTS professor_gerencia_mensagens ON public.class_messages;
CREATE POLICY professor_gerencia_mensagens ON public.class_messages FOR ALL
  USING (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = class_messages.class_id) AND (c.teacher_id = auth.uid()))))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = class_messages.class_id) AND (c.teacher_id = auth.uid()))))
  );

-- Backup: policies for classes
DROP POLICY IF EXISTS classes_delete_own ON public.classes;
CREATE POLICY classes_delete_own ON public.classes FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS classes_insert_self ON public.classes;
CREATE POLICY classes_insert_self ON public.classes FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS classes_min_all ON public.classes;
CREATE POLICY classes_min_all ON public.classes FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS classes_min_select ON public.classes;
CREATE POLICY classes_min_select ON public.classes FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS classes_owner_modify ON public.classes;
CREATE POLICY classes_owner_modify ON public.classes FOR ALL
  USING (teacher_id = ( SELECT auth.uid() AS uid))
  WITH CHECK (teacher_id = ( SELECT auth.uid() AS uid));

DROP POLICY IF EXISTS classes_owner_select ON public.classes;
CREATE POLICY classes_owner_select ON public.classes FOR SELECT
  USING (teacher_id = ( SELECT auth.uid() AS uid));

DROP POLICY IF EXISTS classes_student_enrolled_select ON public.classes;
CREATE POLICY classes_student_enrolled_select ON public.classes FOR SELECT
  USING (get_student_enrolled(id, auth.uid()));

DROP POLICY IF EXISTS classes_students_view ON public.classes;
CREATE POLICY classes_students_view ON public.classes FOR SELECT
  USING (auth.role() = 'authenticated'::text);

DROP POLICY IF EXISTS classes_update_own ON public.classes;
CREATE POLICY classes_update_own ON public.classes FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Backup: policies for cosmetic_purchases
DROP POLICY IF EXISTS cosmetics_profile_owner ON public.cosmetic_purchases;
CREATE POLICY cosmetics_profile_owner ON public.cosmetic_purchases FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS usuario_gerencia_cosmeticos ON public.cosmetic_purchases;
CREATE POLICY usuario_gerencia_cosmeticos ON public.cosmetic_purchases FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Backup: policies for enrollments
DROP POLICY IF EXISTS aluno_gerencia_propria_matricula ON public.enrollments;
CREATE POLICY aluno_gerencia_propria_matricula ON public.enrollments FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS enrollments_prof_delete_by_class_owner ON public.enrollments;
CREATE POLICY enrollments_prof_delete_by_class_owner ON public.enrollments FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = enrollments.class_id) AND (c.teacher_id = auth.uid()))))
  );

DROP POLICY IF EXISTS enrollments_prof_insert_by_class_owner ON public.enrollments;
CREATE POLICY enrollments_prof_insert_by_class_owner ON public.enrollments FOR INSERT
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = enrollments.class_id) AND (c.teacher_id = auth.uid()))))
  );

DROP POLICY IF EXISTS enrollments_prof_select_by_class_owner ON public.enrollments;
CREATE POLICY enrollments_prof_select_by_class_owner ON public.enrollments FOR SELECT
  USING (
    ((EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = enrollments.class_id) AND (c.teacher_id = auth.uid()))))
    OR (student_id = auth.uid()))
  );

DROP POLICY IF EXISTS enrollments_student_delete ON public.enrollments;
CREATE POLICY enrollments_student_delete ON public.enrollments FOR DELETE
  USING (student_id = ( SELECT auth.uid() AS uid));

DROP POLICY IF EXISTS enrollments_student_insert ON public.enrollments;
CREATE POLICY enrollments_student_insert ON public.enrollments FOR INSERT
  WITH CHECK (student_id = ( SELECT auth.uid() AS uid));

DROP POLICY IF EXISTS enrollments_student_manage ON public.enrollments;
CREATE POLICY enrollments_student_manage ON public.enrollments FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS enrollments_student_select ON public.enrollments;
CREATE POLICY enrollments_student_select ON public.enrollments FOR SELECT
  USING (student_id = ( SELECT auth.uid() AS uid));

DROP POLICY IF EXISTS enrollments_teacher_delete ON public.enrollments;
CREATE POLICY enrollments_teacher_delete ON public.enrollments FOR DELETE
  USING (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = enrollments.class_id) AND (c.teacher_id = ( SELECT auth.uid() AS uid))))))
  );

DROP POLICY IF EXISTS enrollments_teacher_read ON public.enrollments;
CREATE POLICY enrollments_teacher_read ON public.enrollments FOR SELECT
  USING (
    ((auth.uid() = student_id) OR (auth.uid() = ( SELECT c.teacher_id
       FROM classes c
      WHERE (c.id = enrollments.class_id))))
  );

DROP POLICY IF EXISTS enrollments_teacher_select ON public.enrollments;
CREATE POLICY enrollments_teacher_select ON public.enrollments FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = enrollments.class_id) AND (c.teacher_id = ( SELECT auth.uid() AS uid)))))
  );

DROP POLICY IF EXISTS professor_le_matriculas ON public.enrollments;
CREATE POLICY professor_le_matriculas ON public.enrollments FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = enrollments.class_id) AND (c.teacher_id = auth.uid()))))
  );

-- Backup: policies for mission_classes
DROP POLICY IF EXISTS aluno_vê_jornada ON public.mission_classes;
CREATE POLICY aluno_vê_jornada ON public.mission_classes FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM enrollments e
      WHERE ((e.class_id = mission_classes.class_id) AND (e.student_id = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_classes_delete_guard ON public.mission_classes;
CREATE POLICY mission_classes_delete_guard ON public.mission_classes FOR SELECT
  USING (
    ((EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = mission_classes.class_id) AND (c.teacher_id = auth.uid()))))
    AND is_mission_owned_by_current_user(mission_id))
  );

DROP POLICY IF EXISTS mission_classes_insert_guard ON public.mission_classes;
CREATE POLICY mission_classes_insert_guard ON public.mission_classes FOR INSERT
  WITH CHECK (
    ((EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = mission_classes.class_id) AND (c.teacher_id = auth.uid()))))
    AND is_mission_owned_by_current_user(mission_id))
  );

DROP POLICY IF EXISTS mission_classes_prof_manage ON public.mission_classes;
CREATE POLICY mission_classes_prof_manage ON public.mission_classes FOR ALL
  USING (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = mission_classes.class_id) AND (c.teacher_id = auth.uid()))))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = mission_classes.class_id) AND (c.teacher_id = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_classes_select_guard ON public.mission_classes;
CREATE POLICY mission_classes_select_guard ON public.mission_classes FOR SELECT
  USING (
    ((EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = mission_classes.class_id) AND (c.teacher_id = auth.uid()))))
    AND is_mission_owned_by_current_user(mission_id))
  );

DROP POLICY IF EXISTS mission_classes_student_select ON public.mission_classes;
CREATE POLICY mission_classes_student_select ON public.mission_classes FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM enrollments e
      WHERE ((e.class_id = mission_classes.class_id) AND (e.student_id = ( SELECT auth.uid() AS uid)))))
  );

DROP POLICY IF EXISTS mission_classes_student_select_enrolled ON public.mission_classes;
CREATE POLICY mission_classes_student_select_enrolled ON public.mission_classes FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM enrollments e
      WHERE ((e.class_id = mission_classes.class_id) AND (e.student_id = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_classes_student_view ON public.mission_classes;
CREATE POLICY mission_classes_student_view ON public.mission_classes FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM enrollments e
      WHERE ((e.class_id = mission_classes.class_id) AND (e.student_id = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_classes_teacher_select ON public.mission_classes;
CREATE POLICY mission_classes_teacher_select ON public.mission_classes FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = mission_classes.class_id) AND (c.teacher_id = ( SELECT auth.uid() AS uid))))))
  ;

DROP POLICY IF EXISTS professor_gerencia_jornada ON public.mission_classes;
CREATE POLICY professor_gerencia_jornada ON public.mission_classes FOR ALL
  USING (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = mission_classes.class_id) AND (c.teacher_id = auth.uid()))))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM classes c
      WHERE ((c.id = mission_classes.class_id) AND (c.teacher_id = auth.uid()))))
  );

-- Backup: policies for mission_options
DROP POLICY IF EXISTS coord_gerencia_opcoes ON public.mission_options;
CREATE POLICY coord_gerencia_opcoes ON public.mission_options FOR ALL
  USING (
    (EXISTS ( SELECT 1
       FROM (mission_questions q
         JOIN missions m ON ((m.id = q.mission_id)))
      WHERE ((q.id = mission_options.question_id) AND (m.created_by = auth.uid()))))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM (mission_questions q
         JOIN missions m ON ((m.id = q.mission_id)))
      WHERE ((q.id = mission_options.question_id) AND (m.created_by = auth.uid()))))
  );

DROP POLICY IF EXISTS le_opcoes_missao_publicada ON public.mission_options;
CREATE POLICY le_opcoes_missao_publicada ON public.mission_options FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM (mission_questions q
         JOIN missions m ON ((m.id = q.mission_id)))
      WHERE ((q.id = mission_options.question_id) AND ((m.status = 'published'::text) OR (m.created_by = auth.uid())))))
  );

DROP POLICY IF EXISTS mission_options_assigned_students ON public.mission_options;
CREATE POLICY mission_options_assigned_students ON public.mission_options FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM ((mission_classes mc
         JOIN enrollments e ON ((e.class_id = mc.class_id)))
         JOIN mission_questions q ON ((q.id = mission_options.question_id)))
      WHERE ((mc.mission_id = q.mission_id) AND (e.student_id = ( SELECT auth.uid() AS uid)))))
  );

DROP POLICY IF EXISTS mission_options_delete_guard ON public.mission_options;
CREATE POLICY mission_options_delete_guard ON public.mission_options FOR DELETE
  USING (
    (EXISTS ( SELECT 1
       FROM (mission_questions q
         JOIN missions m ON ((m.id = q.mission_id)))
      WHERE ((q.id = mission_options.question_id) AND (m.created_by = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_options_insert_guard ON public.mission_options;
CREATE POLICY mission_options_insert_guard ON public.mission_options FOR INSERT
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM (mission_questions q
         JOIN missions m ON ((m.id = q.mission_id)))
      WHERE ((q.id = mission_options.question_id) AND (m.created_by = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_options_select_guard ON public.mission_options;
CREATE POLICY mission_options_select_guard ON public.mission_options FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM (mission_questions q
         JOIN missions m ON ((m.id = q.mission_id)))
      WHERE ((q.id = mission_options.question_id) AND (m.created_by = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_options_staff ON public.mission_options;
CREATE POLICY mission_options_staff ON public.mission_options FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM profiles p
      WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['professor'::text, 'coordenador'::text])))))
  );

DROP POLICY IF EXISTS mission_options_student_select_assigned ON public.mission_options;
CREATE POLICY mission_options_student_select_assigned ON public.mission_options FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM (((mission_questions q
         JOIN missions m ON ((m.id = q.mission_id)))
         JOIN mission_classes mc ON ((mc.mission_id = m.id)))
         JOIN enrollments e ON ((e.class_id = mc.class_id)))
      WHERE ((q.id = mission_options.question_id) AND (m.status = 'published'::text) AND (e.student_id = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_options_update_guard ON public.mission_options;
CREATE POLICY mission_options_update_guard ON public.mission_options FOR UPDATE
  USING (
    (EXISTS ( SELECT 1
       FROM (mission_questions q
         JOIN missions m ON ((m.id = q.mission_id)))
      WHERE ((q.id = mission_options.question_id) AND (m.created_by = auth.uid()))))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM (mission_questions q
         JOIN missions m ON ((m.id = q.mission_id)))
      WHERE ((q.id = mission_options.question_id) AND (m.created_by = auth.uid()))))
  );

-- Backup: policies for mission_questions
DROP POLICY IF EXISTS coord_gerencia_perguntas ON public.mission_questions;
CREATE POLICY coord_gerencia_perguntas ON public.mission_questions FOR ALL
  USING (
    (EXISTS ( SELECT 1
       FROM missions m
      WHERE ((m.id = mission_questions.mission_id) AND (m.created_by = auth.uid()))))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM missions m
      WHERE ((m.id = mission_questions.mission_id) AND (m.created_by = auth.uid()))))
  );

DROP POLICY IF EXISTS le_perguntas_missao_publicada ON public.mission_questions;
CREATE POLICY le_perguntas_missao_publicada ON public.mission_questions FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM missions m
      WHERE ((m.id = mission_questions.mission_id) AND ((m.status = 'published'::text) OR (m.created_by = auth.uid())))))
  );

DROP POLICY IF EXISTS mission_questions_assigned_students ON public.mission_questions;
CREATE POLICY mission_questions_assigned_students ON public.mission_questions FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM (mission_classes mc
         JOIN enrollments e ON ((e.class_id = mc.class_id)))
      WHERE ((mc.mission_id = mission_questions.mission_id) AND (e.student_id = ( SELECT auth.uid() AS uid)))))
  );

DROP POLICY IF EXISTS mission_questions_delete_guard ON public.mission_questions;
CREATE POLICY mission_questions_delete_guard ON public.mission_questions FOR DELETE
  USING (
    (EXISTS ( SELECT 1
       FROM missions m
      WHERE ((m.id = mission_questions.mission_id) AND (m.created_by = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_questions_insert_guard ON public.mission_questions;
CREATE POLICY mission_questions_insert_guard ON public.mission_questions FOR INSERT
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM missions m
      WHERE ((m.id = mission_questions.mission_id) AND (m.created_by = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_questions_select_guard ON public.mission_questions;
CREATE POLICY mission_questions_select_guard ON public.mission_questions FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM missions m
      WHERE ((m.id = mission_questions.mission_id) AND (m.created_by = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_questions_staff ON public.mission_questions;
CREATE POLICY mission_questions_staff ON public.mission_questions FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM profiles p
      WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['professor'::text, 'coordenador'::text])))))
  );

DROP POLICY IF EXISTS mission_questions_student_select_assigned ON public.mission_questions;
CREATE POLICY mission_questions_student_select_assigned ON public.mission_questions FOR SELECT
  USING (
    (EXISTS ( SELECT 1
       FROM ((missions m
         JOIN mission_classes mc ON ((mc.mission_id = m.id)))
         JOIN enrollments e ON ((e.class_id = mc.class_id)))
      WHERE ((m.id = mission_questions.mission_id) AND (m.status = 'published'::text) AND (e.student_id = auth.uid()))))
  );

DROP POLICY IF EXISTS mission_questions_update_guard ON public.mission_questions;
CREATE POLICY mission_questions_update_guard ON public.mission_questions FOR UPDATE
  USING (
    (EXISTS ( SELECT 1
       FROM missions m
      WHERE ((m.id = mission_questions.mission_id) AND (m.created_by = auth.uid()))))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1
       FROM missions m
      WHERE ((m.id = mission_questions.mission_id) AND (m.created_by = auth.uid()))))
  );

-- Backup: policies for missions
DROP POLICY IF EXISTS coordenador_gerencia_missoes ON public.missions;
CREATE POLICY coordenador_gerencia_missoes ON public.missions FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS missions_delete_own ON public.missions;
CREATE POLICY missions_delete_own ON public.missions FOR DELETE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS missions_insert_self ON public.missions;
CREATE POLICY missions_insert_self ON public.missions FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS missions_select_own ON public.missions;
CREATE POLICY missions_select_own ON public.missions FOR SELECT
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS missions_student_select_assigned ON public.missions;
CREATE POLICY missions_student_select_assigned ON public.missions FOR SELECT
  USING (student_has_access_to_mission(id));

DROP POLICY IF EXISTS missions_update_own ON public.missions;
CREATE POLICY missions_update_own ON public.missions FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS professor_le_missoes_publicadas ON public.missions;
CREATE POLICY professor_le_missoes_publicadas ON public.missions FOR SELECT
  USING ((status = 'published'::text) OR (auth.uid() = created_by));