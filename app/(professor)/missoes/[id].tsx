import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';

type MissionRow = { id: string; title: string; description: string | null; status: 'draft' | 'published'; created_by: string | null };
type QuestionRow = { id: string; prompt: string; order_index: number };
type OptionRow = { id: string; question_id: string; text: string; is_correct: boolean };
type ClassRow = { id: string; name: string; code: string };
type AssignedClass = { classId: string; className: string; orderIndex: number };

export default function ProfessorMissionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [mission, setMission] = useState<MissionRow | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<string, OptionRow[]>>({});
  const [teacherClasses, setTeacherClasses] = useState<ClassRow[]>([]);
  const [assigned, setAssigned] = useState<AssignedClass[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const missionId = useMemo(() => id ?? null, [id]);

  async function loadMission() {
    if (!missionId) return;
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('id,title,description,status,created_by')
        .eq('id', missionId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        Alert.alert('Missão não encontrada', 'Esta missão pode ter sido removida pelo coordenador.');
        router.back();
        return;
      }
      setMission(data as MissionRow);

      if (data.created_by) {
        const { data: creator } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', data.created_by)
          .maybeSingle();
        setCreatorName((creator?.nome as string | null) ?? null);
      } else {
        setCreatorName(null);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar a missão.');
      router.back();
    }
  }

  async function loadQuestions() {
    if (!missionId) return;
    const { data: questionRows, error } = await supabase
      .from('mission_questions')
      .select('id,prompt,order_index')
      .eq('mission_id', missionId)
      .order('order_index', { ascending: true });
    if (error) return;
    setQuestions((questionRows as QuestionRow[]) ?? []);
    const questionIds = (questionRows ?? []).map((row: any) => row.id);
    if (questionIds.length === 0) {
      setOptionsByQuestion({});
      return;
    }
    const { data: optionRows, error: optErr } = await supabase
      .from('mission_options')
      .select('id,question_id,text,is_correct')
      .in('question_id', questionIds);
    if (optErr) return;
    const grouped: Record<string, OptionRow[]> = {};
    (optionRows ?? []).forEach((opt: any) => {
      if (!grouped[opt.question_id]) grouped[opt.question_id] = [];
      grouped[opt.question_id].push(opt as OptionRow);
    });
    Object.values(grouped).forEach((list) => list.sort((a, b) => a.text.localeCompare(b.text)));
    setOptionsByQuestion(grouped);
  }

  async function loadAssignments() {
    if (!missionId || !user?.id) return;
    const { data: classRows } = await supabase
      .from('classes')
      .select('id,name,code')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });
    const classes = (classRows as ClassRow[]) ?? [];
    setTeacherClasses(classes);
    const classIds = classes.map((cls) => cls.id);
    if (classIds.length === 0) {
      setAssigned([]);
      return;
    }
    const { data: missionClassRows } = await supabase
      .from('mission_classes')
      .select('class_id,order_index')
      .eq('mission_id', missionId)
      .in('class_id', classIds)
      .order('order_index', { ascending: true });
    const assignedList = (missionClassRows ?? []).map((row: any) => {
      const cls = classes.find((c) => c.id === row.class_id);
      return {
        classId: row.class_id as string,
        className: cls?.name ?? 'Turma',
        orderIndex: (row.order_index as number | null) ?? 0,
      };
    });
    assignedList.sort((a, b) => a.orderIndex - b.orderIndex);
    setAssigned(assignedList);
  }

  useEffect(() => {
    loadMission();
    loadQuestions();
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, user?.id]);

  useEffect(() => {
    if (!missionId) return;
    const channel = supabase
      .channel(`prof-mission-detail-${missionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_classes', filter: `mission_id=eq.${missionId}` },
        () => loadAssignments(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_questions', filter: `mission_id=eq.${missionId}` },
        () => loadQuestions(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_options' },
        () => loadQuestions(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  const classesNotAssigned = teacherClasses.filter(
    (cls) => !assigned.some((row) => row.classId === cls.id),
  );

  async function assignToClass(classRow: ClassRow) {
    if (!missionId || !user?.id) return;
    try {
      setAssigning(true);
      const { error } = await supabase
        .from('mission_classes')
        .upsert(
          { mission_id: missionId, class_id: classRow.id, order_index: assigned.length, added_by: user.id },
          { onConflict: 'mission_id,class_id', ignoreDuplicates: false },
        );
      if (error) throw error;
      await loadAssignments();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível adicionar a missão à turma.');
    } finally {
      setAssigning(false);
    }
  }

  async function removeFromClass(classId: string) {
    if (!missionId) return;
    try {
      setAssigning(true);
      const { error } = await supabase
        .from('mission_classes')
        .delete()
        .eq('mission_id', missionId)
        .eq('class_id', classId);
      if (error) throw error;
      await loadAssignments();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível remover a missão da turma.');
    } finally {
      setAssigning(false);
    }
  }

  function openClassDetail(classId: string) {
    router.push({ pathname: "/(professor)/turmas/[id]", params: { id: classId } } as any);
  }

  if (!mission) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgLight, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.navy800 }}>Carregando missão...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgLight }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 20, color: colors.navy900 }}>{mission.title}</Text>
        {!!mission.description && (
          <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>{mission.description}</Text>
        )}
        <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>
          Autor: {creatorName ?? 'Coordenador'}
        </Text>
        <Text style={{ color: mission.status === 'published' ? colors.brandCyan : colors.brandPink, marginTop: spacing.xs }}>
          Status: {mission.status === 'published' ? 'Publicada' : 'Rascunho'}
        </Text>
        {mission.status !== 'published' && (
          <Text style={{ color: colors.brandPink, marginTop: spacing.sm }}>
            Esta missão não está publicada no momento. Solicite ao coordenador para publicá-la novamente.
          </Text>
        )}
        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          style={{ marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.brandCyan, alignItems: 'center' }}
        >
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Gerenciar turmas</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: spacing.xl, gap: spacing.sm }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Turmas com esta missão</Text>
        {assigned.length === 0 && (
          <Text style={{ color: colors.navy800 }}>
            Nenhuma turma vinculada. Use o botão acima para adicionar esta missão a uma turma.
          </Text>
        )}
        {assigned.map((cls, index) => (
          <Animated.View
            key={cls.classId}
            entering={FadeInUp.duration(350).delay(index * 60)}
            style={{ backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.soft }}
          >
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>{cls.className}</Text>
              <Text style={{ color: colors.navy800 }}>Posição na jornada: {cls.orderIndex + 1}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => openClassDetail(cls.classId)}
                style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.brandCyan }}
              >
                <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>Abrir turma</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={assigning}
                onPress={() => removeFromClass(cls.classId)}
                style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.brandPink }}
              >
                <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Remover</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Perguntas</Text>
        {questions.length === 0 && (
          <Text style={{ color: colors.navy800 }}>Nenhuma pergunta cadastrada para esta missão ainda.</Text>
        )}
        {questions.map((question, index) => (
          <Animated.View
            key={question.id}
            entering={FadeInUp.duration(350).delay(index * 60)}
            style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, ...shadows.soft }}
          >
            <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>
              {index + 1}. {question.prompt}
            </Text>
            {(optionsByQuestion[question.id] ?? []).map((option) => (
              <View
                key={option.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.sm,
                  borderRadius: radii.sm,
                  backgroundColor: option.is_correct ? colors.brandCyan + '33' : 'transparent',
                }}
              >
                <Ionicons
                  name={option.is_correct ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={option.is_correct ? colors.brandCyan : colors.navy800}
                />
                <Text style={{ color: colors.navy900 }}>{option.text}</Text>
              </View>
            ))}
          </Animated.View>
        ))}
      </View>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setModalOpen(false)}>
          <View />
        </Pressable>
        <View style={{ backgroundColor: colors.white, padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Adicionar a uma turma</Text>
          {classesNotAssigned.length === 0 && (
            <Text style={{ color: colors.navy800 }}>
              Todas as suas turmas já possuem esta missão ou você ainda não criou turmas.
            </Text>
          )}
          {classesNotAssigned.map((cls) => (
            <View
              key={cls.id}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md }}
            >
              <View>
                <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>{cls.name}</Text>
                <Text style={{ color: colors.navy800 }}>Código: {cls.code}</Text>
              </View>
              <TouchableOpacity
                disabled={assigning}
                onPress={() => assignToClass(cls)}
                style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.brandCyan }}
              >
                <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setModalOpen(false)}
            style={{ paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.navy800, alignItems: 'center' }}
          >
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Concluir</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}
