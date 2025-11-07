import { useEffect, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, spacing } from "../../../src/theme/tokens";
import { goBackOrReplace } from "../../../src/utils/navigation";

export default function PlayLessonRedirect() {
  const params = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const router = useRouter();

  const missionId = useMemo(() => {
    if (Array.isArray(params.lessonId)) {
      return params.lessonId[0] ?? null;
    }
    return params.lessonId ?? null;
  }, [params.lessonId]);

  useEffect(() => {
    if (!missionId) {
      goBackOrReplace(router, { pathname: "/(aluno)/missoes" } as any);
      return;
    }

    router.replace({
      pathname: "/(aluno)/play/[missionId]",
      params: { missionId },
    } as any);
  }, [missionId, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgLight,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <ActivityIndicator color={colors.brandCyan} size="large" />
      <Text style={{ color: colors.navy800, textAlign: "center" }}>
        Carregando missão...
      </Text>
    </View>
  );
}
