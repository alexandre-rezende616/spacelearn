import { supabase } from '../../lib/supabaseClient';
import type {
  AnswerResult,
  ClassSummary,
  Medal,
  MissionAvailabilityIssue,
  MissionContent,
  MissionSummary,
  MissionWithClasses,
  Option,
  ProfessorLibraryPayload,
  StudentMissionPayload,
} from './types';

function mapMissionRows(rows: any[]): MissionSummary[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    created_by: row.created_by ?? null,
    creatorName: row.creatorName ?? null,
  }));
}

export async function fetchStudentMissions(studentId: string): Promise<StudentMissionPayload> {
  const { data: enrollments, error: enrollErr } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId);
  if (enrollErr) throw enrollErr;

  const classIds = (enrollments ?? []).map((row: any) => row.class_id);
  if (!classIds.length) {
    return { missions: [], classIds: [] };
  }

  const { data: missionClassRows, error: mcErr } = await supabase
    .from('mission_classes')
    .select('mission_id, class_id, order_index, classes(id,name)')
    .in('class_id', classIds);
  if (mcErr) throw mcErr;

  const missionIds = Array.from(new Set(missionClassRows?.map((mc: any) => mc.mission_id) ?? []));
  if (!missionIds.length) {
    return { missions: [], classIds };
  }

  const { data: missionRows, error: missionErr } = await supabase
    .from('missions')
    .select('id,title,description,status,created_at')
    .in('id', missionIds)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (missionErr) throw missionErr;

  const missionMap: Record<string, MissionWithClasses> = {};
  (missionRows ?? []).forEach((row: any) => {
    missionMap[row.id] = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      created_at: row.created_at,
      classes: [],
    };
  });

  (missionClassRows ?? []).forEach((mc: any) => {
    const mission = missionMap[mc.mission_id];
    if (!mission) return;
    if (mc.classes) {
      mission.classes.push({ id: mc.classes.id, name: mc.classes.name });
    }
  });

  return { missions: Object.values(missionMap), classIds };
}

export async function fetchProfessorLibrary(teacherId: string): Promise<ProfessorLibraryPayload> {
  const { data: classRows, error: classErr } = await supabase
    .from('classes')
    .select('id,name,code')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (classErr) throw classErr;

  const classes: ClassSummary[] = (classRows ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    code: row.code,
  }));
  const classIds = classes.map((cls) => cls.id);

  let assignments: { mission_id: string; class_id: string; order_index: number | null; max_attempts_per_question?: number | null }[] = [];
  if (classIds.length) {
    const { data: assRows, error: assErr } = await supabase
      .from('mission_classes')
      .select('mission_id,class_id,order_index,max_attempts_per_question')
      .in('class_id', classIds);
    if (assErr) throw assErr;
    assignments = assRows ?? [];
  }

  const { data: missionRows, error: missionErr } = await supabase
    .from('missions')
    .select('id,title,description,created_by,created_at,status')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (missionErr) throw missionErr;

  const creatorIds = Array.from(
    new Set((missionRows ?? []).map((m: any) => m.created_by).filter((id): id is string => !!id)),
  );
  let creatorMap: Record<string, string | null> = {};
  if (creatorIds.length) {
    const { data: profileRows } = await supabase.from('profiles').select('id,nome').in('id', creatorIds);
    creatorMap = (profileRows ?? []).reduce<Record<string, string | null>>((acc, row: any) => {
      acc[row.id] = row.nome ?? null;
      return acc;
    }, {});
  }

  const missions: MissionSummary[] = mapMissionRows(
    (missionRows ?? []).map((row: any) => ({
      ...row,
      creatorName: row.created_by ? creatorMap[row.created_by] ?? null : null,
    })),
  );

  const assignmentsFlat = assignments.map((assignment) => {
    const classInfo = classes.find((cls) => cls.id === assignment.class_id);
    return {
      missionId: assignment.mission_id,
      classId: assignment.class_id,
      className: classInfo?.name ?? 'Turma',
      orderIndex: assignment.order_index ?? 0,
      attemptLimit: assignment.max_attempts_per_question ?? null,
    };
  });

  return { missions, classes, assignments: assignmentsFlat };
}

export async function assignMissionToClass(params: {
  missionId: string;
  classId: string;
  teacherId: string;
  currentLength: number;
  attemptLimit?: number | null;
}) {
  const { missionId, classId, teacherId, currentLength, attemptLimit } = params;
  const { error } = await supabase.from('mission_classes').upsert(
    {
      mission_id: missionId,
      class_id: classId,
      order_index: currentLength,
      added_by: teacherId,
      max_attempts_per_question: attemptLimit ?? null,
    },
    { onConflict: 'mission_id,class_id', ignoreDuplicates: false },
  );
  if (error) throw error;
}

export async function unassignMissionFromClass(missionId: string, classId: string) {
  const { error } = await supabase
    .from('mission_classes')
    .delete()
    .eq('mission_id', missionId)
    .eq('class_id', classId);
  if (error) throw error;
}

type MissionContentRow = {
  question_id: string;
  prompt: string;
  order_index: number;
  option_id: string | null;
  option_text: string | null;
};

export async function fetchMissionContent(missionId: string): Promise<MissionContent> {
  const { data, error } = await supabase.rpc('student_fetch_mission_content', {
    p_mission_id: missionId,
  });
  if (error) throw error;
  const rows = (data as MissionContentRow[]) ?? [];
  const questionsMap = new Map<string, { id: string; prompt: string; order_index: number }>();
  const optionsByQuestion: Record<string, Option[]> = {};

  rows.forEach((row) => {
    if (!questionsMap.has(row.question_id)) {
      questionsMap.set(row.question_id, {
        id: row.question_id,
        prompt: row.prompt,
        order_index: row.order_index,
      });
    }
    if (row.option_id) {
      if (!optionsByQuestion[row.question_id]) optionsByQuestion[row.question_id] = [];
      optionsByQuestion[row.question_id].push({
        id: row.option_id,
        question_id: row.question_id,
        text: row.option_text ?? '',
      });
    }
  });

  const questions = Array.from(questionsMap.values()).sort((a, b) => a.order_index - b.order_index);

  return {
    questions,
    optionsByQuestion,
  };
}

export async function diagnoseMissionAvailability(
  missionId: string,
  studentId: string,
): Promise<MissionAvailabilityIssue> {
  const { data: assignments } = await supabase
    .from('mission_classes')
    .select('class_id')
    .eq('mission_id', missionId);
  if (!assignments?.length) return 'no-classes';

  const classIds = assignments.map((row: any) => row.class_id);
  const { data: enrollmentRows } = await supabase
    .from('enrollments')
    .select('class_id')
    .in('class_id', classIds)
    .eq('student_id', studentId);
  if (!enrollmentRows?.length) return 'student-not-enrolled';

  return 'no-questions';
}

export async function fetchTotalCorrect(studentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('progress')
    .select('correct_count')
    .eq('student_id', studentId);
  if (error) throw error;
  return (data ?? []).reduce((sum, row: any) => sum + ((row.correct_count as number | null) ?? 0), 0);
}

export async function fetchMedals(): Promise<Medal[]> {
  const { data, error } = await supabase
    .from('medals')
    .select('id,title,description,required_correct')
    .order('required_correct', { ascending: true });
  if (error) throw error;
  return (data as Medal[]) ?? [];
}

export async function submitMissionAnswer(params: {
  missionId: string;
  questionId: string;
  optionId: string;
  currentCorrectCount: number;
  totalQuestions: number;
  completed: boolean;
}): Promise<AnswerResult> {
  const { missionId, questionId, optionId, currentCorrectCount, totalQuestions, completed } = params;
  const { data, error } = await supabase.rpc('student_submit_mission_answer', {
    p_mission_id: missionId,
    p_question_id: questionId,
    p_option_id: optionId,
    p_current_correct: currentCorrectCount,
    p_total_questions: totalQuestions,
    p_completed: completed,
  });
  if (error) throw error;
  const payload = (data as any[] | null)?.[0];
  if (!payload) {
    throw new Error('Resposta inválida.');
  }
  return {
    isCorrect: !!payload.is_correct,
    nextCorrect: payload.next_correct ?? currentCorrectCount,
    nextTotal: payload.total_questions ?? totalQuestions,
    completed: !!payload.completed,
    deltaXp: payload.delta_xp ?? 0,
    deltaCoins: payload.delta_coins ?? 0,
    prevMissionCorrect: payload.prev_mission_correct ?? 0,
  };
}
