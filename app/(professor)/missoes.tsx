// iuri meu bem listagem simples de rascunhos de missoes
import { Text, TouchableOpacity, View } from "react-native";
import { colors, radii, spacing } from "../../src/theme/tokens";

// dados mockados ate integrar com backend
const drafts = [
  { id: "001", titulo: "Ambiente Espacial", status: "Rascunho" },
  { id: "002", titulo: "Riscos e EPIs", status: "Rascunho" },
];

export default function MissoesProfessor() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, padding: spacing.lg }}>
      <Text style={{ fontFamily: "Inter-Bold", fontSize: 20, color: colors.navy900, marginBottom: spacing.md }}>
        Missões
      </Text>
      {drafts.map((m) => (
        <View key={m.id} style={{ borderWidth: 1, borderColor: colors.bgLight, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md }}>
          <Text style={{ fontFamily: "Inter-Bold", color: colors.navy900 }}>{m.titulo}</Text>
          <Text style={{ color: colors.navy800, marginVertical: 6 }}>{m.status}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TouchableOpacity style={{ backgroundColor: colors.brandCyan, padding: 10, borderRadius: radii.sm }}>
              <Text style={{ color: "white" }}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: colors.brandPink, padding: 10, borderRadius: radii.sm }}>
              <Text style={{ color: "white" }}>Publicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}
