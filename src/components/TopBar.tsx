// barra do topo mostrando streak e moedas
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { colors, spacing } from "../theme/tokens";

// recebe coins e streak por props pra exibir
export function TopBar({ coins = 0, streak = 0 }: { coins?: number; streak?: number }) {
  return (
    <View style={{ padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: colors.navy900, fontFamily: "Inter-Bold", fontSize: 20 }}>SpaceLearn</Text>
      <View style={{ flexDirection: "row", gap: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="flame" size={20} color={colors.brandPink} />
          <Text style={{ marginLeft: 6, color: colors.navy900, fontFamily: "Inter-Bold" }}>{streak}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="planet" size={20} color={colors.brandCyan} />
          <Text style={{ marginLeft: 6, color: colors.navy900, fontFamily: "Inter-Bold" }}>{coins}</Text>
        </View>
      </View>
    </View>
  );
}
