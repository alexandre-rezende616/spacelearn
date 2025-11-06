// iuri meu bem painel inicial do aluno com progresso
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { TopBar } from "../../src/components/TopBar";
import { colors, spacing } from "../../src/theme/tokens";
import { supabase } from "../../src/lib/supabaseClient";
import { useAuth } from "../../src/store/useAuth";

function computeLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

export default function PainelAluno() {
  const user = useAuth((s) => s.user);
  const [coins, setCoins] = useState(0);
  const [xp, setXp] = useState(0);
  const [completed, setCompleted] = useState(0);

  async function loadStats() {
    if (!user?.id) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp_total,coins_balance")
      .eq("id", user.id)
      .maybeSingle();
    setCoins((profile?.coins_balance as number | null) ?? 0);
    setXp((profile?.xp_total as number | null) ?? 0);
    const { count } = await supabase
      .from("progress")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("completed", true);
    setCompleted(count ?? 0);
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`student-dashboard-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "progress", filter: `student_id=eq.${user.id}` },
        () => loadStats(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => loadStats(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const level = computeLevel(xp);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <TopBar coins={coins} level={level} />
      <View style={{ padding: spacing.lg }}>
        <Text style={{ fontFamily: "Inter-Bold", fontSize: 22, color: colors.navy900 }}>
          Bem-vindo(a) ao SpaceLearn!
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.navy800 }}>
          Seu progresso atual:
        </Text>

        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          <Text style={{ color: colors.navy900 }}>💰 Moedas: {coins}</Text>
          <Text style={{ color: colors.navy900 }}>⚡ XP: {xp}</Text>
          <Text style={{ color: colors.navy900 }}>🏆 Nível: {level}</Text>
          <Text style={{ color: colors.navy900 }}>
            🚀 Missões concluídas: {completed}
          </Text>
        </View>
      </View>
    </View>
  );
}
