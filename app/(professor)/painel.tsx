import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, ScrollView } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  const router = useRouter();
  const [nome, setNome] = useState<string | null>(null);
  const [counts, setCounts] = useState({ classes: 0, missions: 0, medals: 0, students: 0 });

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

  const cards: InfoCard[] = useMemo(() => [
      { key: 'turmas', title: 'Turmas ativas', value: counts.classes, icon: 'people', tint: colors.brandCyan },
      { key: 'missoes', title: 'Missões na jornada', value: counts.missions, icon: 'flag', tint: colors.brandPink },
      { key: 'medalhas', title: 'Missões concluídas', value: counts.medals, icon: 'ribbon', tint: colors.navy800 },
      { key: 'alunos', title: 'Total de alunos', value: counts.students, icon: 'rocket', tint: colors.navy900 },
    ], [counts]);
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    async function fetchCounts() {
      try {
        const c1 = await supabase.from('classes').select('id', { count: 'exact', head: true }).eq('teacher_id', userId);
        const classesCount = c1.count ?? 0;
        const { data: cls } = await supabase.from('classes').select('id').eq('teacher_id', userId);
        const classIds = (cls ?? []).map((r: any) => r.id);
        let studentsCount = 0;
        if (classIds.length) {
          const { data: enr } = await supabase.from('enrollments').select('student_id').in('class_id', classIds);
          const uniq = new Set((enr ?? []).map((e: any) => e.student_id));
          studentsCount = uniq.size;
        }
        let missionsCount = 0;
        let missionIds: string[] = [];
        if (classIds.length) {
          const { data: missionLinks } = await supabase.from('mission_classes').select('mission_id').in('class_id', classIds);
          missionIds = Array.from(new Set((missionLinks ?? []).map((row: any) => row.mission_id)));
          missionsCount = missionIds.length;
        }
        let medalsCount = 0;
        if (missionIds.length) {
          const { data: prog } = await supabase.from('progress').select('id,completed').in('mission_id', missionIds).eq('completed', true);
          medalsCount = (prog ?? []).length;
        }
        setCounts({ classes: classesCount, missions: missionsCount, medals: medalsCount, students: studentsCount });
      } catch {}
    }
    fetchCounts();
    const ch = supabase
      .channel(`prof-dashboard-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes', filter: `teacher_id=eq.${userId}` }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_classes' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'progress' }, fetchCounts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);
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
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm }}>
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
                
                style={{ fontFamily: "Inter-Bold", color: colors.navy800, flex: 1, flexWrap: "wrap", minWidth: 0 }}
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
            onPress={() => router.push("/(professor)/missoes")}
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
            onPress={() => router.push("/(professor)/turmas")}
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
            onPress={() => router.push("/(professor)/medalhas")}
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






