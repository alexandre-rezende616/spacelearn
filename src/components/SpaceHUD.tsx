import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../store/useAuth';
import { colors, radii, spacing } from '../theme/tokens';

function computeLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

export function SpaceHUD() {
  const user = useAuth((s) => s.user);
  const [coins, setCoins] = useState(0);
  const [xp, setXp] = useState(0);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    async function load() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins_balance,xp_total')
        .eq('id', user.id)
        .maybeSingle();
      if (!mounted) return;
      setCoins((profile?.coins_balance as number | null) ?? 0);
      setXp((profile?.xp_total as number | null) ?? 0);
      const { count } = await supabase
        .from('progress')
        .select('id', { head: true, count: 'exact' })
        .eq('student_id', user.id)
        .eq('completed', true);
      if (!mounted) return;
      setCompleted(count ?? 0);
    }
    load();
    const channel = supabase
      .channel(`space-hud-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        load,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'progress', filter: `student_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const level = computeLevel(xp);

  return (
    <View
      style={{
        borderRadius: radii.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.white, fontFamily: 'Inter-Bold', fontSize: 18 }}>Seu progresso</Text>
        <Text style={{ color: colors.white, opacity: 0.8 }}>Missões concluídas: {completed}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="trophy" size={20} color={colors.brandPink} />
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Lv {level}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="sparkles" size={20} color={colors.brandCyan} />
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>{coins}</Text>
        </View>
      </View>
    </View>
  );
}
