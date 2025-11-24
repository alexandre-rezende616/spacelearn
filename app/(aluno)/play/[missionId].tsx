import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';
import { goBackOrReplace } from '../../../src/utils/navigation';

type ClassRow = { id: string; name: string; code: string; created_at: string };
type StudentRow = { id: string; nome: string | null };
type MissionInfo = { id: string; title: string; description: string | null; status: 'draft' | 'published'; created_by: string | null; creatorName?: string | null };
type MissionAssignment = { mission: MissionInfo; orderIndex: number };
type MessageRow = { id: string; content: string; created_at: string };

// Novo tipo para as tentativas
type AttemptRow = { student_id: string; is_correct: boolean };

async function copyToClipboard(text: string) {
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
  } catch {
    // noop
  }
}

export default function TurmaDetalhesProfessor() {
  const { id: classId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [classInfo, setClassInfo] = useState<ClassRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [assignments, setAssignments] = useState<MissionAssignment[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [postingMessage, setPostingMessage] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);

  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [availableMissions, setAvailableMissions] = useState<MissionInfo[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);

  // --- NOVOS ESTADOS PARA ESTATÍSTICAS ---
  const [classStats, setClassStats] = useState({ average: 0, total: 0 });
  const [studentGrades, setStudentGrades] = useState<Record<string, string>>({});
  // ---------------------------------------

  const missionIds = useMemo(() => assignments.map((assignment) => assignment.mission.id), [assignments]);

  async function loadClassInfo() {
    if (!classId) return;
    const { data, error } = await supabase
      .from('classes')
      .select('id,name,code,created_at,teacher_id')
      .eq('id', classId)
      .maybeSingle();
    if (error || !data) {
      Alert.alert('Turma não encontrada', 'Verifique se você tem acesso a esta turma.');
      goBackOrReplace(router, { pathname: "/(professor)/turmas" } as any);
      return;
    }
    if (data.teacher_id !== user?.id) {
      Alert.alert('Sem acesso', 'Esta turma pertence a outro professor.');
      goBackOrReplace(router, { pathname: "/(professor)/turmas" } as any);
      return;
    }
    setClassInfo({
      id: data.id,
      name: data.name,
      code: data.code,
      created_at: data.created_at,
    });
  }

  async function loadStudentsAndStats() {
    if (!classId) return;
    
    // 1. Carrega Enrollments (IDs)
    const { data: enrollRows } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId);
    
    const studentIds = (enrollRows ?? []).map((row: any) => row.student_id);
    
    if (studentIds.length === 0) {
      setStudents([]);
      setStudentGrades({});
      setClassStats({ average: 0, total: 0 });
      return;
    }

    // 2. Carrega Profiles (Nomes)
    const { data: profileRows } = await supabase.from('profiles').select('id,nome').in('id', studentIds);
    const ordered = (profileRows ?? [])
      .map((row: any) => ({
        id: row.id as string,
        nome: (row.nome as string | null) ?? 'Aluno',
      }))
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''));
    setStudents(ordered);
    
    //Lexandre, presta atenção nessa parte aqui: :D
    // 3. --- LÓGICA DE CÁLCULO DE MÉDIA ---
    try {
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select('student_id, is_correct')
        .in('student_id', studentIds);
      
      const attempts = (attemptsData as AttemptRow[]) ?? [];

      // Média Global
      let globalAvg = 0;
      if (attempts.length > 0) {
        const totalCorrect = attempts.filter(a => a.is_correct).length;
        globalAvg = (totalCorrect / attempts.length) * 100;
      }
      setClassStats({ average: globalAvg, total: attempts.length });

      // Média Individual
      const gradesMap: Record<string, string> = {};
      studentIds.forEach((sid) => {
        const myAttempts = attempts.filter(a => a.student_id === sid);
        if (myAttempts.length > 0) {
          const myCorrect = myAttempts.filter(a => a.is_correct).length;
          const nota = (myCorrect / myAttempts.length) * 10;
          gradesMap[sid] = nota.toFixed(1);
        }
      });
      setStudentGrades(gradesMap);

    } catch (e) {
      console.log("Erro ao calcular notas:", e);
    }
    // -------------------------------------
  }

  function confirmRemoveStudent(student: StudentRow) {
    Alert.alert(
      'Remover aluno',
      `Deseja remover ${student.nome ?? 'este aluno'} da turma?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => removeStudent(student),
        },
      ],
    );
  }

  async function removeStudent(student: StudentRow) {
    if (!classId) return;
    try {
      setRemovingStudentId(student.id);
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', student.id);
      if (error) throw error;
      await loadStudentsAndStats();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível remover o aluno.');
    } finally {
      setRemovingStudentId(null);
    }
  }

  async function loadAssignments() {
    if (!classId) return;
    const { data: assignmentRows } = await supabase
      .from('mission_classes')
      .select('mission_id,order_index')
      .eq('class_id', classId)
      .order('order_index', { ascending: true });
    const rows = assignmentRows ?? [];
    if (rows.length === 0) {
      setAssignments([]);
      return;
    }
    const missionIdsList = rows.map((row: any) => row.mission_id);
    const { data: missionRows } = await supabase
      .from('missions')
      .select('id,title,description,status,created_by')
      .in('id', missionIdsList);
    const missionMap = (missionRows ?? []).reduce<Record<string, MissionInfo>>((map, row: any) => {
      map[row.id] = {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        created_by: row.created_by,
      };
      return map;
    }, {});

    const creatorIds = Array.from(
      new Set(
        Object.values(missionMap)
          .map((mission) => mission.created_by)
          .filter((id): id is string => !!id),
      ),
    );
    let creatorMap: Record<string, string | null> = {};
    if (creatorIds.length) {
      const { data: creators } = await supabase.from('profiles').select('id,nome').in('id', creatorIds);
      creatorMap = (creators ?? []).reduce<Record<string, string | null>>((map, row: any) => {
        map[row.id] = row.nome ?? null;
        return map;
      }, {});
    }

    const assembled: MissionAssignment[] = [];
    rows.forEach((row: any) => {
      const mission = missionMap[row.mission_id];
      if (!mission) return;
      const creatorId = mission.created_by ?? undefined;
      assembled.push({
        mission: { ...mission, creatorName: creatorId ? creatorMap[creatorId] ?? null : null },
        orderIndex: (row.order_index as number | null) ?? 0,
      });
    });
    assembled.sort((a, b) => a.orderIndex - b.orderIndex);
    setAssignments(assembled);
  }

  async function loadMessages() {
    if (!classId) return;
    const { data: messageRows } = await supabase
      .from('class_messages')
      .select('id,content,created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    setMessages((messageRows as MessageRow[]) ?? []);
  }

  useEffect(() => {
    if (!classId || !user?.id) return;
    loadClassInfo();
    loadStudentsAndStats(); // Mudamos o nome da função
    loadAssignments();
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, user?.id]);

  useEffect(() => {
    if (!classId) return;
    const channel = supabase
      .channel(`prof-class-${classId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments', filter: `class_id=eq.${classId}` },
        () => loadStudentsAndStats(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_classes', filter: `class_id=eq.${classId}` },
        () => loadAssignments(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_messages', filter: `class_id=eq.${classId}` },
        () => loadMessages(),
      )
      // --- Adicionado: Escutar tabela attempts para atualizar notas em tempo real ---
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attempts' },
        () => loadStudentsAndStats(), // Recarrega as estatísticas
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function postMessage() {
    const userId = user?.id;
    if (!newMessage.trim() || !classId || !userId) return;
    try {
      setPostingMessage(true);
      const { error } = await supabase
        .from('class_messages')
        .insert({ class_id: classId, teacher_id: userId, content: newMessage.trim() });
      if (error) throw error;
      setNewMessage('');
      await loadMessages();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível enviar o aviso.');
    } finally {
      setPostingMessage(false);
    }
  }

  async function removeMission(missionId: string) {
    if (!classId) return;
    try {
      const { error } = await supabase
        .from('mission_classes')
        .delete()
        .eq('class_id', classId)
        .eq('mission_id', missionId);
      if (error) throw error;
      await loadAssignments();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível remover a missão.');
    }
  }

  async function reorderAssignments(updated: MissionAssignment[]) {
    if (!classId) return;
    const updates = updated.map((assignment, index) =>
      supabase
        .from('mission_classes')
        .update({ order_index: index })
        .eq('class_id', classId)
        .eq('mission_id', assignment.mission.id),
    );
    await Promise.all(updates);
    setAssignments(updated);
  }

  async function moveMission(missionId: string, direction: 'up' | 'down') {
    const currentIndex = assignments.findIndex((assignment) => assignment.mission.id === missionId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= assignments.length) return;
    const newList = [...assignments];
    const [moved] = newList.splice(currentIndex, 1);
    newList.splice(targetIndex, 0, moved);
    setAssignments(newList.map((assignment, index) => ({ ...assignment, orderIndex: index })));
    try {
      await reorderAssignments(newList);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível reordenar a missão.');
      loadAssignments();
    }
  }

  async function openMissionModal() {
    if (!classId) return;
    setMissionModalOpen(true);
    setLoadingMissions(true);
    try {
      const { data: missions } = await supabase
        .from('missions')
        .select('id,title,description,status,created_by')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);
      const filtered = (missions ?? []).filter((mission: any) => !missionIds.includes(mission.id));
      if (filtered.length === 0) {
        setAvailableMissions([]);
        return;
      }
      const creatorIds = Array.from(
        new Set(filtered.map((mission: any) => mission.created_by).filter((id: any): id is string => !!id)),
      );
      let creatorMap: Record<string, string | null> = {};
      if (creatorIds.length) {
        const { data: creators } = await supabase.from('profiles').select('id,nome').in('id', creatorIds);
        creatorMap = (creators ?? []).reduce<Record<string, string | null>>((map, row: any) => {
          map[row.id] = row.nome ?? null;
          return map;
        }, {});
      }
      const assembled: MissionInfo[] = filtered.map((mission: any) => ({
        id: mission.id,
        title: mission.title,
        description: mission.description,
        status: mission.status,
        created_by: mission.created_by,
        creatorName: creatorMap[mission.created_by] ?? null,
      }));
      setAvailableMissions(assembled);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar missões disponíveis.');
    } finally {
      setLoadingMissions(false);
    }
  }

  async function addMissionToClass(mission: MissionInfo) {
    const userId = user?.id;
    if (!classId || !userId) return;
    try {
      const { error } = await supabase
        .from('mission_classes')
        .upsert(
          { mission_id: mission.id, class_id: classId, order_index: assignments.length, added_by: userId },
          { onConflict: 'mission_id,class_id', ignoreDuplicates: false },
        );
      if (error) throw error;
      await loadAssignments();
      setMissionModalOpen(false);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível adicionar a missão.');
    }
  }

  function confirmDeleteClass() {
    Alert.alert(
      'Excluir turma',
      'Tem certeza de que deseja excluir esta turma? Esta ação remove as missões atribuídas e as matrículas dos alunos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: deleteClass,
        },
      ],
    );
  }

  async function deleteClass() {
    if (!classId) return;
    try {
      setDeletingClass(true);
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) throw error;
      Alert.alert('Turma removida', 'A turma foi excluída com sucesso.');
      router.replace('/(professor)/turmas');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível excluir a turma.');
    } finally {
      setDeletingClass(false);
    }
  }

  if (!classInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgLight, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.navy800 }}>Carregando informações da turma...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgLight }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
      <View style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900, flex: 1 }}>{classInfo.name}</Text>
          <TouchableOpacity
            onPress={confirmDeleteClass}
            disabled={deletingClass}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radii.md,
              backgroundColor: colors.brandPink,
              opacity: deletingClass ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>
              {deletingClass ? 'Excluindo...' : 'Excluir turma'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ color: colors.navy800 }}>Código:</Text>
          <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900, letterSpacing: 1 }}>{classInfo.code}</Text>
          <TouchableOpacity
            onPress={async () => {
              await copyToClipboard(classInfo.code);
              Alert.alert('Código copiado', classInfo.code);
            }}
          >
            <Ionicons name="copy" size={18} color={colors.navy800} />
          </TouchableOpacity>
        </View>
        <Text style={{ color: colors.navy800 }}>
          Criada em {new Date(classInfo.created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* --- NOVO: CARD DE ESTATÍSTICAS --- */}
      <View style={{ backgroundColor: colors.navy900, borderRadius: radii.lg, padding: spacing.lg, ...shadows.soft }}>
        <Text style={{ color: colors.white, fontFamily: 'Inter-Regular', fontSize: 14, opacity: 0.8 }}>
          Desempenho da Turma (Acertos)
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.xs }}>
          <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold', fontSize: 36 }}>
            {classStats.average.toFixed(0)}%
          </Text>
          <Text style={{ color: colors.white, marginBottom: 6, marginLeft: spacing.xs, fontFamily: 'Inter-Medium' }}>
            de precisão média
          </Text>
        </View>
        <Text style={{ color: colors.white, fontSize: 12, marginTop: spacing.sm, opacity: 0.6 }}>
          Baseado em {classStats.total} respostas de alunos
        </Text>
      </View>
      {/* ---------------------------------- */}

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Jornada de missões</Text>
          <TouchableOpacity
            onPress={openMissionModal}
            style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.brandCyan }}
          >
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Adicionar missão</Text>
          </TouchableOpacity>
        </View>
        {assignments.length === 0 && (
          <Text style={{ color: colors.navy800 }}>
            Nenhuma missão adicionada ainda. Clique em &quot;Adicionar missão&quot; para montar o caminho desta turma.
          </Text>
        )}
        {assignments.map((assignment, index) => (
          <Animated.View
            key={assignment.mission.id}
            entering={FadeInUp.duration(350).delay(index * 70)}
            style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, ...shadows.soft }}
          >
            <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>
              {index + 1}. {assignment.mission.title}
            </Text>
            {!!assignment.mission.description && (
              <Text style={{ color: colors.navy800 }}>{assignment.mission.description}</Text>
            )}
            <Text style={{ color: colors.navy800 }}>
              Autor: {assignment.mission.creatorName ?? 'Coordenador'}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <TouchableOpacity
                onPress={() => moveMission(assignment.mission.id, 'up')}
                disabled={index === 0}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.navy800,
                  alignItems: 'center',
                  opacity: index === 0 ? 0.4 : 1,
                }}
              >
                <Text style={{ color: colors.navy800, fontFamily: 'Inter-Bold' }}>Subir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveMission(assignment.mission.id, 'down')}
                disabled={index === assignments.length - 1}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.navy800,
                  alignItems: 'center',
                  opacity: index === assignments.length - 1 ? 0.4 : 1,
                }}
              >
                <Text style={{ color: colors.navy800, fontFamily: 'Inter-Bold' }}>Descer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeMission(assignment.mission.id)}
                style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.brandPink }}
              >
                <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Remover</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Alunos ({students.length})</Text>
        {students.length === 0 && <Text style={{ color: colors.navy800 }}>Nenhum aluno entrou nesta turma ainda.</Text>}
        {students.map((student, index) => {
          const studentAvg = studentGrades[student.id];
          return (
            <Animated.View
              key={student.id}
              entering={FadeInUp.duration(350).delay(index * 60)}
              style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs, ...shadows.soft }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>{student.nome ?? 'Aluno'}</Text>
                  {/* --- MOSTRAR NOTA INDIVIDUAL --- */}
                  <Text style={{ fontSize: 12, marginTop: 4, color: studentAvg ? (Number(studentAvg) >= 6 ? '#00D07B' : '#FF6B6B') : colors.navy800 }}>
                    Média: {studentAvg ? studentAvg : '-'}
                  </Text>
                  {/* ------------------------------- */}
                </View>
                
                <TouchableOpacity
                  onPress={() => confirmRemoveStudent(student)}
                  disabled={removingStudentId === student.id}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radii.md,
                    backgroundColor: colors.brandPink,
                  }}
                >
                  <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>
                    {removingStudentId === student.id ? 'Removendo...' : 'Remover'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Avisos da turma</Text>
        <View style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, ...shadows.soft }}>
          <TextInput
            placeholder="Escreva um aviso para seus alunos"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md, minHeight: 80 }}
          />
          <TouchableOpacity
            onPress={postMessage}
            disabled={postingMessage}
            style={{ alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.brandCyan, borderRadius: radii.md }}
          >
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>{postingMessage ? 'Enviando...' : 'Enviar aviso'}</Text>
          </TouchableOpacity>
        </View>

        {messages.length === 0 && <Text style={{ color: colors.navy800 }}>Nenhum aviso publicado ainda.</Text>}
        {messages.map((message, index) => (
          <Animated.View
            key={message.id}
            entering={FadeInUp.duration(350).delay(index * 50)}
            style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs, ...shadows.soft }}
          >
            <Text style={{ color: colors.navy800 }}>{message.content}</Text>
            <Text style={{ color: colors.navy800, fontSize: 12 }}>
              {new Date(message.created_at).toLocaleString()}
            </Text>
          </Animated.View>
        ))}
      </View>

      <Modal visible={missionModalOpen} transparent animationType="slide" onRequestClose={() => setMissionModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setMissionModalOpen(false)}>
          <View />
        </Pressable>
        <View style={{ backgroundColor: colors.white, padding: spacing.lg, gap: spacing.md, maxHeight: '70%' }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Adicionar missão</Text>
          {loadingMissions && <Text style={{ color: colors.navy800 }}>Carregando missões...</Text>}
          {!loadingMissions && availableMissions.length === 0 && (
            <Text style={{ color: colors.navy800 }}>
              Nenhuma missão disponível ou todas já foram adicionadas a esta turma.
            </Text>
          )}
          <ScrollView style={{ maxHeight: 320 }}>
            {availableMissions.map((mission) => (
              <TouchableOpacity
                key={mission.id}
                activeOpacity={0.8}
                onPress={() => addMissionToClass(mission)}
                style={{
                  backgroundColor: colors.bgLight,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>{mission.title}</Text>
                {!!mission.description && (
                  <Text style={{ color: colors.navy800 }} numberOfLines={2}>
                    {mission.description}
                  </Text>
                )}
                <Text style={{ color: colors.navy800 }}>
                  Autor: {mission.creatorName ?? 'Coordenador'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={() => setMissionModalOpen(false)}
            style={{ paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.navy800, alignItems: 'center' }}
          >
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}