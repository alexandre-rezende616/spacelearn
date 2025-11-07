import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';
import { goBackOrReplace } from '../../../src/utils/navigation';

type ClassRow = { id: string; name: string; code: string; created_at: string };
type MissionInfo = { id: string; title: string; description: string | null; status: 'draft' | 'published'; orderIndex: number };
type MessageRow = { id: string; content: string; created_at: string };

export default function TurmaDetalheAluno() {
  const { id: classId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [classInfo, setClassInfo] = useState<ClassRow | null>(null);
  const [missions, setMissions] = useState<MissionInfo[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, { completed: boolean; correct: number; total: number }>>({});

  const publishedMissions = useMemo(
    () => missions.filter((mission) => mission.status === 'published'),
    [missions],
  );

  async function loadClass() {
    if (!classId) return;
    const { data, error } = await supabase
      .from('classes')
      .select('id,name,code,created_at')
      .eq('id', classId)
      .maybeSingle();
    if (error || !data) {
      Alert.alert('Turma não encontrada', 'Este código pode estar incorreto ou a turma foi removida.');
      goBackOrReplace(router, { pathname: "/(aluno)/turmas" } as any);
      return;
    }
    setClassInfo(data as ClassRow);
  }

  async function loadMissions() {
    if (!classId) return;
    const { data: missionClassRows } = await supabase
      .from('mission_classes')
      .select('mission_id,order_index')
      .eq('class_id', classId)
      .order('order_index', { ascending: true });
    const rows = missionClassRows ?? [];
    if (rows.length === 0) {
      setMissions([]);
      setProgressMap({});
      return;
    }
    const missionIds = rows.map((row: any) => row.mission_id);
    const { data: missionRows } = await supabase
      .from('missions')
      .select('id,title,description,status')
      .in('id', missionIds);
    const map = (missionRows ?? []).reduce<Record<string, MissionInfo>>((acc, row: any) => {
      acc[row.id] = {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        orderIndex: 0,
      };
      return acc;
    }, {});
    const ordered = rows
      .map((row: any) => {
        const mission = map[row.mission_id];
        if (!mission) return null;
        return { ...mission, orderIndex: (row.order_index as number | null) ?? 0 };
      })
      .filter((row): row is MissionInfo => !!row)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    setMissions(ordered);

    if (user?.id) {
      const { data: progressRows } = await supabase
        .from('progress')
        .select('mission_id,completed,correct_count,total_count')
        .in('mission_id', ordered.map((mission) => mission.id))
        .eq('student_id', user.id);
      const pMap = (progressRows ?? []).reduce<Record<string, { completed: boolean; correct: number; total: number }>>(
        (acc, row: any) => {
          acc[row.mission_id] = {
            completed: !!row.completed,
            correct: row.correct_count ?? 0,
            total: row.total_count ?? 0,
          };
          return acc;
        },
        {},
      );
      setProgressMap(pMap);
    }
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
    if (!classId) return;
    loadClass();
    loadMissions();
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, user?.id]);

  useEffect(() => {
    if (!classId || !user?.id) return;
    const channel = supabase
      .channel(`student-class-${classId}-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_classes', filter: `class_id=eq.${classId}` },
        () => loadMissions(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_messages', filter: `class_id=eq.${classId}` },
        () => loadMessages(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'progress', filter: `student_id=eq.${user.id}` },
        () => loadMissions(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, user?.id]);

  function openMission(missionId: string) {
    router.push({ pathname: "/(aluno)/play/[missionId]", params: { missionId } } as any);
  }

  if (!classInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgLight, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.navy800 }}>Carregando turma...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgLight }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
      <View style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, ...shadows.soft }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900 }}>{classInfo.name}</Text>
        <Text style={{ color: colors.navy800 }}>Código: {classInfo.code}</Text>
        <Text style={{ color: colors.navy800 }}>
          Desde {new Date(classInfo.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Sua jornada</Text>
        {missions.length === 0 && (
          <Text style={{ color: colors.navy800 }}>
            O professor ainda não adicionou missões para esta turma.
          </Text>
        )}
        {missions.map((mission, index) => {
          const progress = progressMap[mission.id];
          const completed = progress?.completed ?? false;
          const status = mission.status === 'published' ? (completed ? 'Concluída' : 'Disponível') : 'Indisponível';
          const statusColor =
            mission.status !== 'published' ? colors.brandPink : completed ? colors.brandCyan : colors.navy800;
          return (
            <Animated.View
              key={mission.id}
              entering={FadeInUp.duration(350).delay(index * 70)}
              style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, ...shadows.soft }}
            >
              <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>
                {index + 1}. {mission.title}
              </Text>
              {!!mission.description && (
                <Text style={{ color: colors.navy800 }}>{mission.description}</Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: statusColor, fontFamily: 'Inter-Bold' }}>{status}</Text>
                {progress && (
                  <Text style={{ color: colors.navy800 }}>
                    {progress.correct}/{progress.total || '?'} acertos
                  </Text>
                )}
              </View>
              {mission.status === 'published' && (
                <TouchableOpacity
                  onPress={() => openMission(mission.id)}
                  style={{ marginTop: spacing.sm, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
                >
                  <Ionicons name="play-circle" size={20} color={colors.brandCyan} />
                  <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>
                    {completed ? 'Jogar novamente' : 'Iniciar missão'}
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          );
        })}
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Avisos do professor</Text>
        {messages.length === 0 && (
          <Text style={{ color: colors.navy800 }}>
            Nenhum aviso por aqui ainda. Fique de olho para novidades.
          </Text>
        )}
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
    </ScrollView>
  );
}
