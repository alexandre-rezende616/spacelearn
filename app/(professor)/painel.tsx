import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, ScrollView } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, shadows } from "../../src/theme/tokens";
import { useAuth } from "../../src/store/useAuth";
import { supabase } from "../../src/lib/supabaseClient";

type InfoCard = {
  key: string;
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
};

export default function PainelProfessor() {
  const { user } = useAuth();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      try {
        const id = user?.id;
        if (!id) return;
        const { data, error } = await supabase
          .from("profiles")
          .select("nome")
          .eq("id", id)
          .maybeSingle();
        if (!mounted) return;
        if (error) {
          setNome("Professor");
          return;
        }
        setNome((data?.nome as string | undefined) ?? "Professor");
      } catch {
        setNome("Professor");
      }
    }
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const cards: InfoCard[] = useMemo(
    () => [
      { key: "turmas", title: "Turmas ativas", value: 3, icon: "people", tint: colors.brandCyan },
      { key: "missoes", title: "Missões em andamento", value: 12, icon: "flag", tint: colors.brandPink },
      { key: "medalhas", title: "Medalhas atribuídas", value: 27, icon: "ribbon", tint: colors.navy800 },
      { key: "alunos", title: "Total de alunos", value: 86, icon: "rocket", tint: colors.navy900 },
    ],
    [],
  );

  const width = Dimensions.get("window").width;
  const isSmall = width < 360;
  const cardWidth = isSmall ? "100%" : "48%";

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg }}
      style={{ flex: 1, backgroundColor: colors.bgLight }}
    >
      {/* Cabeçalho */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontFamily: "Inter-Bold", fontSize: 24, color: colors.navy800 }}>
          {`Bem-vindo, Prof. ${nome ?? "..."}!`}
        </Text>
        <Text style={{ marginTop: spacing.xs, color: colors.navy800 }}>
          Painel do Professor
        </Text>
      </View>

      {/* Cards informativos */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: spacing.md,
          marginBottom: spacing.xl,
        }}
      >
        {cards.map((c, idx) => (
          <Animated.View
            key={c.key}
            entering={FadeInUp.duration(450).delay(idx * 90)}
            style={{
              width: cardWidth as any,
              backgroundColor: colors.white,
              borderRadius: radii.lg,
              padding: spacing.lg,
              ...shadows.soft,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: c.tint,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: spacing.md,
                }}
              >
                <Ionicons name={c.icon} color={colors.white} size={20} />
              </View>
              <Text
                numberOfLines={2}
                style={{ fontFamily: "Inter-Bold", color: colors.navy800, flexShrink: 1 }}
              >
                {c.title}
              </Text>
            </View>
            <Text style={{ fontFamily: "Inter-Bold", fontSize: 22, color: colors.navy900 }}>{c.value}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Ações rápidas */}
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontFamily: "Inter-Bold", fontSize: 18, color: colors.navy800, marginBottom: spacing.md }}>
          Ações rápidas
        </Text>

        <View style={{ gap: spacing.md }}>
          <TouchableOpacity
            onPress={() => console.log("Criar missão")}
            style={{
              backgroundColor: colors.brandCyan,
              paddingVertical: spacing.lg,
              borderRadius: radii.lg,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.white, fontFamily: "Inter-Bold", fontSize: 16 }}>Criar missão</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => console.log("Ver turmas")}
            style={{
              backgroundColor: colors.white,
              paddingVertical: spacing.lg,
              borderRadius: radii.lg,
              alignItems: "center",
              borderWidth: 2,
              borderColor: colors.brandCyan,
            }}
          >
            <Text style={{ color: colors.navy800, fontFamily: "Inter-Bold", fontSize: 16 }}>Ver turmas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => console.log("Gerenciar medalhas")}
            style={{
              backgroundColor: colors.brandPink,
              paddingVertical: spacing.lg,
              borderRadius: radii.lg,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.white, fontFamily: "Inter-Bold", fontSize: 16 }}>Gerenciar medalhas</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
