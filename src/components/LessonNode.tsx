// versao simples do nodo de missao sem animacao
import { View, Text, TouchableOpacity } from "react-native";
import { colors, spacing, radii, shadows } from "../theme/tokens";

export type LessonStatus = "locked" | "available" | "done";

// bloqueado, disponivel ou concluido muda cor e estado
export function LessonNode({ title, status = "available", onPress }:{
  title: string; status?: LessonStatus; onPress?: () => void;
}) {
  // define cor de fundo com base no status
  const bg = status === "done" ? colors.brandCyan : status === "available" ? colors.brandPink : "#C6C9D6";
  return (
    <TouchableOpacity disabled={status === "locked"} onPress={onPress} style={{ alignItems: "center" }}>
      <View style={{ backgroundColor: bg, padding: spacing.lg, borderRadius: radii.pill, width: 140, ...shadows.soft }}>
        <Text style={{ color: "white", fontFamily: "Inter-Bold", textAlign: "center" }}>{title}</Text>
      </View>
      {status === "locked" && <Text style={{ marginTop: 6, color: colors.navy800, fontSize: 12 }}>Bloqueada</Text>}
    </TouchableOpacity>
  );
}
