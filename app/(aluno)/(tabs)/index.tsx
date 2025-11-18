import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SpaceBackground } from "../../../src/components/SpaceBackground";
import { SpaceButton } from "../../../src/components/SpaceButton";
import { SpaceHUD } from "../../../src/components/SpaceHUD";
import { colors, spacing } from "../../../src/theme/tokens";

export default function PainelAluno() {
  const router = useRouter();

  return (
    <SpaceBackground>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <SpaceHUD />
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: "Inter-Bold", fontSize: 26, color: colors.white }}>
            Bem-vindo(a) ao SpaceLearn!
          </Text>
          <Text style={{ color: colors.white, opacity: 0.8 }}>
            Continue explorando as fases e personalize sua estrela com os recursos que conquistar.
          </Text>
        </View>

        <View
          style={{
            borderRadius: spacing.md,
            padding: spacing.lg,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            gap: spacing.md,
          }}
        >
          <Text style={{ color: colors.white, fontFamily: "Inter-Bold", fontSize: 18 }}>Próximos passos</Text>
          <SpaceButton
            label="Entrar em uma turma"
            icon={<Text style={{ color: colors.white }}>👩‍🚀</Text>}
            onPress={() => router.push("/(aluno)/(tabs)/turmas")}
          />
          <SpaceButton
            label="Abrir caminho estelar"
            icon={<Text style={{ color: colors.white }}>🪐</Text>}
            onPress={() => router.push("/(aluno)/(tabs)/missoes")}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SpaceBackground>
  );
}
