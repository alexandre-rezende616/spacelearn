import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../../src/theme/tokens';
import { useAuth } from '../../../src/store/useAuth';
import { fetchStudentMissions } from '../../../src/modules/missionFlow/api';
import type { MissionWithClasses } from '../../../src/modules/missionFlow/types';
import { AnimatedLessonNode } from '../../../src/components/AnimatedLessonNode';
import { SpaceBackground } from '../../../src/components/SpaceBackground';
import { SpaceHUD } from '../../../src/components/SpaceHUD';

import { supabase } from '../../../src/lib/supabaseClient';

const starField = [
  { top: 10, left: 20, size: 4, opacity: 0.3 },
  { top: 30, left: 120, size: 3, opacity: 0.5 },
  { top: 70, left: 220, size: 5, opacity: 0.4 },
  { top: 110, left: 40, size: 3, opacity: 0.6 },
  { top: 150, left: 180, size: 4, opacity: 0.35 },
  { top: 190, left: 80, size: 2, opacity: 0.5 },
  { top: 230, left: 200, size: 3, opacity: 0.45 },
  { top: 260, left: 60, size: 4, opacity: 0.4 },
];

export default function MissoesAluno() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [missions, setMissions] = useState<MissionWithClasses[]>([]);
  const [loading, setLoading] = useState(false);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [progressByMission, setProgressByMission] = useState<Record<string, { completed: boolean }>>({});

  async function loadAll() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const payload = await fetchStudentMissions(user.id);
      setMissions(payload.missions);
      setClassIds(payload.classIds);
      const missionIds = payload.missions.map((mission) => mission.id);
      if (missionIds.length) {
        const { data: progressRows } = await supabase
          .from('progress')
          .select('mission_id,completed')
          .eq('student_id', user.id)
          .in('mission_id', missionIds);
        const map: Record<string, { completed: boolean }> = {};
        (progressRows ?? []).forEach((row: any) => {
          if (row.mission_id) map[row.mission_id] = { completed: !!row.completed };
        });
        setProgressByMission(map);
      } else {
        setProgressByMission({});
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar missões');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      await loadAll();
    })();
  }, [user?.id]);

  // Realtime: mudanças em mission_classes das turmas do aluno
  useEffect(() => {
    if (!classIds.length) return;
    const sortedKey = [...classIds].sort().join('-');
    const channel = supabase.channel(`student-mc-${sortedKey.slice(0, 40)}`);
    classIds.forEach((cid) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_classes', filter: `class_id=eq.${cid}` },
        () => loadAll(),
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classIds.join(',')]);

  type NodeStatus = 'locked' | 'available' | 'done';
  const missionPath = useMemo(() => {
    let nextAvailableAssigned = false;
    return missions.map((mission, index) => {
      const completed = progressByMission[mission.id]?.completed;
      let status: NodeStatus = 'locked';
      if (completed) {
        status = 'done';
      } else if (!nextAvailableAssigned) {
        status = 'available';
        nextAvailableAssigned = true;
      }
      return { mission, index, status };
    });
  }, [missions, progressByMission]);

  const renderPath = () => (
    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
      <View
        style={{
          backgroundColor: colors.navy900,
          borderRadius: radii.lg,
          padding: spacing.lg,
          gap: spacing.lg,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {starField.map((star, index) => (
          <View
            key={`star-${index}`}
            style={{
              position: 'absolute',
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: colors.white,
              opacity: star.opacity,
            }}
          />
        ))}
        <Text style={{ color: colors.white, fontFamily: 'Inter-Bold', fontSize: 18 }}>
          Caminho estelar
        </Text>
        {missions.length === 0 ? (
          <Text style={{ color: colors.white }}>
            {classIds.length === 0
              ? 'Entre em uma turma para liberar as missões.'
              : 'Nenhuma missão disponível no momento.'}
          </Text>
        ) : (
          missionPath.map((item, index) => {
            const isLeft = index % 2 === 0;
            const classes = item.mission.classes ?? [];
            return (
              <View
                key={item.mission.id}
                style={{
                  flexDirection: isLeft ? 'row' : 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                }}
              >
                <AnimatedLessonNode
                  title={`${index + 1}`}
                  status={item.status}
                  onPress={
                    item.status === 'locked'
                      ? undefined
                      : () =>
                          router.push({
                            pathname: "/(aluno)/play/[missionId]",
                            params: { missionId: item.mission.id },
                          } as any)
                  }
                />
                <View
                  style={{
                    flex: 1,
                    alignItems: isLeft ? 'flex-start' : 'flex-end',
                    gap: spacing.xs,
                  }}
                >
                  <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>
                    {item.mission.title}
                  </Text>
                  {!!item.mission.description && (
                    <Text style={{ color: colors.white, opacity: 0.8, textAlign: isLeft ? 'left' : 'right' }}>
                      {item.mission.description}
                    </Text>
                  )}
                  {classes.length > 0 && (
                    <Text style={{ color: colors.white, opacity: 0.7, fontSize: 12 }}>
                      Turmas: {classes.map((c) => c.name).join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );

  return (
    <SpaceBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg, paddingTop: spacing.lg }}>
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <SpaceHUD />
        </View>
        {renderPath()}
      </ScrollView>
    </SpaceBackground>
  );
}
