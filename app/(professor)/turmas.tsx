import { View, Text, StyleSheet } from 'react-native';

export default function TurmasScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Turmas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600' },
});

