import { useRouter } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { colors, spacing, radii, shadows } from "../../src/theme/tokens";
import { fonts, fontSizes } from "../../src/theme/typography";
import { useAuth } from "../../src/store/useAuth";
import { useUserProgress } from "../../src/store/useUserProgress";

export default function PerfilAluno() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  const { coins, xp, completedLessons } = useUserProgress();

  async function handleLogout() {
    await signOut();
    // Usar caminho absoluto evita problemas de resolução relativa
    router.replace("/auth/login");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg, justifyContent: "center" }}>
      <Animated.View
        entering={FadeInUp.duration(350)}
        style={{ alignItems: "center", gap: spacing.lg }}
      >
        <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.h2, color: colors.navy900 }}>
          Meu Perfil
        </Text>

        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.navy800 }}>
            {user?.email ?? "Convidado"}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: fontSizes.sm, color: colors.navy800 }}>
            {completedLessons.length} lições completas ⭐
          </Text>
        </View>

        <View
          style={{
            width: "100%",
            backgroundColor: colors.white,
            borderRadius: radii.lg,
            padding: spacing.lg,
            gap: spacing.md,
            ...shadows.soft,
          }}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.lg, color: colors.navy900, textAlign: "center" }}>
            Progresso
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.navy900 }}>
              🚀 XP: {xp}
            </Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.navy900 }}>
              🪙 Moedas: {coins}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: colors.error,
            padding: spacing.lg,
            borderRadius: radii.lg,
            width: "100%",
            ...shadows.soft,
          }}
        >
          <Text style={{ color: colors.white, textAlign: "center", fontFamily: fonts.bold, fontSize: fontSizes.md }}>
            Sair da Conta
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

