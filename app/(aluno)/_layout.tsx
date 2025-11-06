// iuri querido abas do app para o aluno
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../src/theme/tokens";
import Logo from "../../components/Logo";

// define rotas e icones das tabs do aluno
export default function AlunoTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerStyle: { backgroundColor: colors.bgLight },
        headerShadowVisible: false,
        headerRight: () => <Logo size={32} background="white" />,
        tabBarActiveTintColor: colors.brandPink,
        tabBarInactiveTintColor: colors.navy800,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Painel", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="missoes"
        options={{ title: "Missões", tabBarIcon: ({ color, size }) => <Ionicons name="planet" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="turmas"
        options={{ title: "Turmas", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="loja"
        options={{ title: "Loja", tabBarIcon: ({ color, size }) => <Ionicons name="cart" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="badges"
        options={{ title: "Medalhas", tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
      <Tabs.Screen name="play" options={{ href: null }} />
    </Tabs>
  );
}

