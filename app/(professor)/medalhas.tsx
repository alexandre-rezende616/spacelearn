import { View, Text, StyleSheet } from 'react-native';

export default function MedalhasScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medalhas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600' },
});

