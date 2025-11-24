import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { colors, radii, shadows, spacing } from "../../../src/theme/tokens";
import { supabase } from "../../../src/lib/supabaseClient";
import { useAuth } from "../../../src/store/useAuth";
import { SpaceBackground } from "../../../src/components/SpaceBackground";
import { SpaceHUD } from "../../../src/components/SpaceHUD";

type MedalRow = {
  id: string;
  title: string;
  description: string | null;
  required_correct: number;
  teacher_id: string;
};

export default function MedalhasAluno() {
  const user = useAuth((s) => s.user);

  const [loading, setLoading] = useState(false);
  const [medals, setMedals] = useState<MedalRow[]>([]);
  const [totalCorrect, setTotalCorrect] = useState(0);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // 1. Busca as medalhas
      const { data: medalsData, error: medalsError } = await supabase
        .from("medals")
        .select("id,title,description,required_correct,teacher_id");

      if (medalsError) throw medalsError;
      setMedals((medalsData as MedalRow[]) ?? []);

      // 2. CONTA os acertos na tabela ATTEMPTS
      const { count, error: countError } = await supabase
        .from("attempts")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("is_correct", true);

      if (countError) throw countError;
      setTotalCorrect(count ?? 0);

    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Não foi possível carregar suas medalhas.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`student-medals-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attempts", filter: `student_id=eq.${user.id}` },
        loadData
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "medals" }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadData]);

  const decorated = useMemo(() => {
    return medals.map((medal) => {
      const required = medal.required_correct > 0 ? medal.required_correct : 1;
      const unlocked = totalCorrect >= required;
      const remaining = Math.max(0, required - totalCorrect);
      const progress = Math.min(1, totalCorrect / required);
      return { ...medal, unlocked, remaining, progress };
    });
  }, [medals, totalCorrect]);

  return (
    <SpaceBackground>
      <View style={{ padding: spacing.lg, gap: spacing.xs }}>
        <SpaceHUD />
        <Text style={{ fontFamily: "Inter-Bold", fontSize: 22, color: colors.white }}>
          Medalhas
        </Text>
        <Text style={{ color: colors.white, opacity: 0.8 }}>
          Total de acertos:{" "}
          <Text style={{ fontFamily: "Inter-Bold", color: colors.brandCyan }}>
            {totalCorrect}
          </Text>
        </Text>
        <Text style={{ color: colors.white, opacity: 0.7 }}>
          Ganhe medalhas assim que atingir as metas definidas pelos professores.
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brandCyan} size="large" />
        </View>
      ) : (
        <FlatList
          data={decorated}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: radii.lg,
                padding: spacing.lg,
                alignItems: "center",
                ...shadows.soft,
              }}
            >
              <Text style={{ fontFamily: "Inter-Bold", color: colors.navy900, fontSize: 18 }}>
                Nenhuma medalha cadastrada
              </Text>
              <Text style={{ color: colors.navy800, marginTop: spacing.xs, textAlign: "center" }}>
                Quando o professor criar medalhas para sua turma, elas aparecerão aqui.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.duration(350).delay(index * 70)}
              style={{
                backgroundColor: colors.white,
                borderRadius: radii.lg,
                padding: spacing.lg,
                gap: spacing.sm,
                ...shadows.soft,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontFamily: "Inter-Bold", fontSize: 18, color: colors.navy900 }}>
                  {item.title}
                </Text>
                <View
                  style={{
                    backgroundColor: item.unlocked ? colors.brandCyan : colors.bgLight,
                    borderRadius: radii.pill, 
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: item.unlocked ? colors.white : colors.navy800,
                      fontFamily: "Inter-Bold",
                    }}
                  >
                    {item.required_correct} acertos
                  </Text>
                </View>
              </View>

              {!!item.description && (
                <Text style={{ color: colors.navy800 }}>{item.description}</Text>
              )}

              <View
                style={{
                  height: 10,
                  borderRadius: radii.md,
                  backgroundColor: colors.bgLight,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.max(8, item.progress * 100)}%`,
                    height: "100%",
                    backgroundColor: item.unlocked ? colors.brandCyan : colors.brandPink,
                  }}
                />
              </View>

              <Text style={{ color: item.unlocked ? colors.brandCyan : colors.navy800 }}>
                {item.unlocked
                  ? "Parabéns! Medalha desbloqueada."
                  : `Faltam ${item.remaining} acertos.`}
              </Text>
            </Animated.View>
          )}
        />
      )}
    </SpaceBackground>
  );
}