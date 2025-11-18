// iuri querido layout interno do fluxo de jogo
import { Stack } from "expo-router";

export default function PlayLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[missionId]" options={{ headerShown: false }} />
    </Stack>
  );
}
