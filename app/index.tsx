// iuri meu bem tela inicial com navegacao para perfis
import { Link } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { colors, radii, shadows, spacing } from "../src/theme/tokens";

// botoes para entrar como aluno ou professor
export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg, justifyContent: "center" }}>
      <Text style={{ fontFamily: "Inter-Bold", fontSize: 28, color: colors.navy800, textAlign: "center", marginBottom: spacing.xl }}>
        SpaceLearn
      </Text>
      <View style={{ gap: spacing.md }}>
        <Link href="/(aluno)" asChild>
          <TouchableOpacity style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, ...shadows.soft }}>
            <Text style={{ color: colors.white, textAlign: "center", fontFamily: "Inter-Bold", fontSize: 18 }}>Entrar como Aluno</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(professor)" asChild>
          <TouchableOpacity style={{ backgroundColor: colors.brandPink, padding: spacing.lg, borderRadius: radii.lg, ...shadows.soft }}>
            <Text style={{ color: colors.white, textAlign: "center", fontFamily: "Inter-Bold", fontSize: 18 }}>Entrar como Professor</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
