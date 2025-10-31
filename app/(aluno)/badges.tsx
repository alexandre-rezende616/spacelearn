import { View, Text, FlatList } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { colors, spacing, radii, shadows } from "../../src/theme/tokens";
import { supabase } from "../../src/lib/supabaseClient";
import { useAuth } from "../../src/store/useAuth";
import { useEffect, useState } from "react";

type Row = { mission_id: string; correct_count: number; total_count: number; xp_awarded: number; coins_awarded: number; completed: boolean };

export default function MedalhasAluno() {
  const user = useAuth((s) => s.user);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('progress')
          .select('mission_id,correct_count,total_count,xp_awarded,coins_awarded,completed')
          .eq('student_id', user.id);
        if (error) throw error;
        setRows((data as Row[]) ?? []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg }}>
      <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900, textAlign: 'center', marginBottom: spacing.lg }}>
        Suas Conquistas
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.mission_id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={!loading ? (
          <Text style={{ textAlign: 'center', color: colors.navy800 }}>Nenhuma conquista ainda.</Text>
        ) : null}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.duration(400).delay(index*60)} style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.soft }}>
            <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900, marginBottom: spacing.xs, flexWrap: 'wrap' }}>
              Missão {item.mission_id.slice(0,8)}…
            </Text>
            <Text style={{ color: colors.navy800 }}>Progresso: {item.correct_count}/{item.total_count}</Text>
            <Text style={{ color: colors.navy800 }}>XP: {item.xp_awarded} • Moedas: {item.coins_awarded}</Text>
            <Text style={{ color: item.completed ? colors.brandCyan : colors.navy800, marginTop: spacing.xs }}>
              {item.completed ? 'Concluída' : 'Em andamento'}
            </Text>
          </Animated.View>
        )}
      />
    </View>
  );
}

