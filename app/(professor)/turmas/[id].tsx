import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing } from '../../../src/theme/tokens';

export default function TurmaDetalhePlaceholder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg, justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900, textAlign: 'center' }}>
        Alunos da turma – em breve
      </Text>
      <Text style={{ marginTop: spacing.md, color: colors.navy800, textAlign: 'center' }}>ID: {id}</Text>
    </View>
  );
}

