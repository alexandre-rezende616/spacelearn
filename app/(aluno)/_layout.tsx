// iuri querido abas do app para o aluno
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../src/theme/tokens";

// define rotas e icones das tabs do aluno
export default function AlunoTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brandPink, tabBarInactiveTintColor: colors.navy800 }}>
      <Tabs.Screen name="index" options={{ title: "Painel", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="lessons" options={{ title: "Missões", tabBarIcon: ({ color, size }) => <Ionicons name="planet" color={color} size={size} /> }} />
      <Tabs.Screen name="badges" options={{ title: "Medalhas", tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} /> }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
      <Tabs.Screen name="play" options={{ href: null }} />
    </Tabs>
  );
}
