// Abas do perfil de professor (Tabs)
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../src/theme/tokens";
import Logo from "../../components/Logo";
import { SpaceHeaderBackground } from "../../src/components/SpaceHeaderBackground";

export default function ProfessorTabs() {
  return (
    <Tabs
      initialRouteName="painel"
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerShadowVisible: false,
        headerBackground: () => <SpaceHeaderBackground />,
        headerTintColor: colors.white,
        headerRight: () => <Logo size={32} background="transparent" />,
        tabBarActiveTintColor: colors.brandCyan, // #00CFE5
        tabBarInactiveTintColor: colors.white,
        tabBarStyle: { backgroundColor: '#05040F', borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarLabelStyle: { fontFamily: "Inter-Medium" },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="painel"
        options={{
          title: "Painel",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="turmas"
        options={{
          title: "Turmas",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="missoes"
        options={{
          title: "Missões",
          tabBarIcon: ({ color, size }) => <Ionicons name="flag" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="medalhas"
        options={{
          title: "Medalhas",
          tabBarIcon: ({ color, size }) => <Ionicons name="ribbon" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: "Conta",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

