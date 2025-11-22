// iuri querido abas do app para o aluno
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../../src/theme/tokens";
import Logo from "../../../components/Logo";
import { SpaceHeaderBackground } from "../../../src/components/SpaceHeaderBackground";

// define rotas e icones das tabs do aluno
export default function AlunoTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerShadowVisible: false,
        headerBackground: () => <SpaceHeaderBackground />,
        headerTintColor: colors.white,
        headerRight: () => <Logo size={32} background="transparent" />,
        tabBarActiveTintColor: colors.brandPink,
        tabBarInactiveTintColor: colors.white,
        tabBarStyle: { backgroundColor: '#05040F', borderTopColor: 'rgba(255,255,255,0.1)' },
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
    </Tabs>
  );
}

