import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { supabase } from '../../src/lib/supabaseClient';
import { useAuth } from '../../src/store/useAuth';

type StatCard = {
  key: string;
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
};

export default function CoordenadorPainel() {
  const user = useAuth((s) => s.user);
  const [nome, setNome] = useState<string>('Coordenador');
  const [stats, setStats] = useState({ missions: 0, published: 0, questions: 0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const userId = user?.id;
      if (!userId) return;
      const { data } = await supabase.from('profiles').select('nome').eq('id', userId).maybeSingle();
      if (!mounted) return;
      setNome((data?.nome as string | null) ?? 'Coordenador');
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    async function fetchStats() {
      try {
        const all = await supabase
          .from('missions')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', userId);
        const published = await supabase
          .from('missions')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', userId)
          .eq('status', 'published');
        const { data: missionIds } = await supabase.from('missions').select('id').eq('created_by', userId);
        let questionCount = 0;
        if (missionIds?.length) {
          const ids = missionIds.map((m) => m.id);
          const { count } = await supabase
            .from('mission_questions')
            .select('id', { count: 'exact', head: true })
            .in('mission_id', ids);
          questionCount = count ?? 0;
        }
        setStats({
          missions: all.count ?? 0,
          published: published.count ?? 0,
          questions: questionCount,
        });
      } catch {
        setStats({ missions: 0, published: 0, questions: 0 });
      }
    }
    fetchStats();
    const channel = supabase
      .channel(`coord-dashboard-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `created_by=eq.${userId}` },
        () => fetchStats(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_questions' },
        () => fetchStats(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const cards: StatCard[] = useMemo(
    () => [
      { key: 'missions', title: 'Missões criadas', value: stats.missions, icon: 'flag', tint: colors.brandCyan },
      { key: 'published', title: 'Publicadas', value: stats.published, icon: 'rocket', tint: colors.brandPink },
      { key: 'questions', title: 'Perguntas no banco', value: stats.questions, icon: 'help-circle', tint: colors.navy800 },
    ],
    [stats],
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgLight }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 24, color: colors.navy900 }}>
          Olá, {nome.split(' ')[0] ?? 'Coordenador'}!
        </Text>
        <Text style={{ marginTop: spacing.xs, color: colors.navy800 }}>
          Centralize e publique os conteúdos que os professores poderão usar.
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        {cards.map((card, index) => (
          <Animated.View
            key={card.key}
            entering={FadeInUp.duration(400).delay(index * 80)}
            style={{
              width: '100%',
              backgroundColor: colors.white,
              borderRadius: radii.lg,
              padding: spacing.lg,
              ...shadows.soft,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: card.tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={card.icon} size={22} color={colors.white} />
              </View>
              <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy800, flex: 1 }}>{card.title}</Text>
              <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900 }}>{card.value}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}
