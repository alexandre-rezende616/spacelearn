import { Stack } from 'expo-router';

export default function AlunoRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="play" options={{ headerShown: false }} />
    </Stack>
  );
}
