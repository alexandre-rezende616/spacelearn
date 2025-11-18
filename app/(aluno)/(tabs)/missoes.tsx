import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { useAuth } from '../../../src/store/useAuth';
import { fetchStudentMissions } from '../../../src/modules/missionFlow/api';
import type { MissionWithClasses } from '../../../src/modules/missionFlow/types';

import { supabase } from '../../../src/lib/supabaseClient';

export default function MissoesAluno() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [missions, setMissions] = useState<MissionWithClasses[]>([]);
  const [loading, setLoading] = useState(false);
  const [classIds, setClassIds] = useState<string[]>([]);

  async function loadAll() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const payload = await fetchStudentMissions(user.id);
      setMissions(payload.missions);
      setClassIds(payload.classIds);
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <View style={{ padding: spacing.lg }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900 }}>Missões</Text>
      </View>

      <FlatList
        data={missions}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md }}
        ListEmptyComponent={!loading ? (
          <Text style={{ textAlign: 'center', color: colors.navy800, marginTop: spacing.xl }}>
            {classIds.length === 0
              ? 'Entre em uma turma para liberar as missões.'
              : 'Nenhuma missão disponível no momento.'}
          </Text>
        ) : null}
        renderItem={({ item, index }) => {
          const classes = item.classes ?? [];
          return (
            <Animated.View
              entering={FadeInUp.duration(450).delay(index * 80)}
              style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.soft }}
            >
              <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: colors.navy900 }}>{item.title}</Text>
              {!!item.description && (
                <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>{item.description}</Text>
              )}
              {classes.length > 0 && (
                <Text style={{ color: colors.navy800, marginTop: spacing.sm }}>
                  Turmas: {classes.map((c) => c.name).join(', ')}
                </Text>
              )}
              <TouchableOpacity onPress={() => router.push({ pathname: "/(aluno)/play/[missionId]", params: { missionId: item.id } } as any)} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
                <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>Jogar</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}
