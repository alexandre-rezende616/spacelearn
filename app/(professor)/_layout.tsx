// iuri meu bem abas para o perfil de professor
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../src/theme/tokens";

// rotas principais do professor com icones
export default function ProfessorTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brandCyan, tabBarInactiveTintColor: colors.navy800 }}>
      <Tabs.Screen name="index" options={{ title: "Painel", tabBarIcon: ({ color, size }) => <Ionicons name="speedometer" color={color} size={size} /> }} />
      <Tabs.Screen name="turmas" options={{ title: "Turmas", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }} />
      <Tabs.Screen name="missoes" options={{ title: "Missões", tabBarIcon: ({ color, size }) => <Ionicons name="construct" color={color} size={size} /> }} />
      <Tabs.Screen name="medalhas" options={{ title: "Medalhas", tabBarIcon: ({ color, size }) => <Ionicons name="ribbon" color={color} size={size} /> }} />
    </Tabs>
  );
}
