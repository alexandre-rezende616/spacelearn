// iuri meu bem painel inicial do aluno com progresso
import { Text, View } from "react-native";
import { TopBar } from "../../src/components/TopBar";
import { useUserProgress } from "../../src/store/useUserProgress";
import { colors, spacing } from "../../src/theme/tokens";

// pega dados do store e mostra status atual
export default function PainelAluno() {
  const { coins, xp, streak, completedLessons } = useUserProgress();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <TopBar coins={coins} streak={streak} />
      <View style={{ padding: spacing.lg }}>
        <Text style={{ fontFamily: "Inter-Bold", fontSize: 22, color: colors.navy900 }}>
          Bem-vindo(a) ao SpaceLearn!
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.navy800 }}>
          Seu progresso atual:
        </Text>

        <View style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.navy900 }}>💰 Moedas: {coins}</Text>
          <Text style={{ color: colors.navy900 }}>⚡ XP: {xp}</Text>
          <Text style={{ color: colors.navy900 }}>
            🚀 Lições concluídas: {completedLessons.length}
          </Text>
        </View>
      </View>
    </View>
  );
}
