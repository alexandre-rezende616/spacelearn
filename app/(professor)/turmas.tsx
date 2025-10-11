import { View, Text } from 'react-native';
import { colors, spacing } from "../../src/theme/tokens";

export default function TurmasScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg, justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900, textAlign: 'center' }}>
        Turmas
      </Text>
      <Text style={{ marginTop: spacing.md, color: colors.navy800, textAlign: 'center' }}>
        Placeholder de Turmas (conteúdo em breve).
      </Text>
    </View>
  );
}
