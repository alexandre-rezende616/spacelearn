import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { supabase } from '../../src/lib/supabaseClient';
import { useAuth } from '../../src/store/useAuth';

type Mission = { id: string; title: string; description: string | null; status: 'draft'|'published'; };
type MCRow = { mission_id: string; class_id: string; classes?: { id: string; name: string } | null };

export default function MissoesAluno() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [byMissionClasses, setByMissionClasses] = useState<Record<string, {id:string;name:string}[]>>({});
  const [loading, setLoading] = useState(false);
  const [classIds, setClassIds] = useState<string[]>([]);

  async function loadAll() {
    if (!user?.id) return;
    try {
      setLoading(true);
      // 1) classes do aluno
      const { data: enrolls, error: e1 } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', user.id);
      if (e1) throw e1;
      const cIds = (enrolls ?? []).map((e: any) => e.class_id);
      setClassIds(cIds);
      if (cIds.length === 0) { setMissions([]); setByMissionClasses({}); return; }

      // 2) mission_classes para essas turmas, com nomes das turmas
      const { data: mcs, error: e2 } = await supabase
        .from('mission_classes')
        .select('mission_id, class_id, classes(id,name)')
        .in('class_id', cIds);
      if (e2) throw e2;
      const missionIds = Array.from(new Set((mcs ?? []).map((mc: MCRow) => mc.mission_id)));

      // 3) missões publicadas
      const { data: miss, error: e3 } = await supabase
        .from('missions')
        .select('id,title,description,status')
        .in('id', missionIds)
        .eq('status', 'published');
      if (e3) throw e3;

      setMissions(miss as Mission[] || []);

      // map missões -> classes
      const map: Record<string, {id:string;name:string}[]> = {};
      (mcs ?? []).forEach((mc: MCRow) => {
        if (!map[mc.mission_id]) map[mc.mission_id] = [];
        if (mc.classes) map[mc.mission_id].push({ id: mc.classes.id, name: mc.classes.name });
      });
      setByMissionClasses(map);
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
    const channel = supabase.channel(`student-mc-${classIds.sort().join('-').slice(0,40)}`);
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
            Nenhuma missão disponível.
          </Text>
        ) : null}
        renderItem={({ item, index }) => {
          const classes = byMissionClasses[item.id] ?? [];
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
              <TouchableOpacity onPress={() => router.push(`/(aluno)/play/${item.id}`)} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
                <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>Jogar</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}
