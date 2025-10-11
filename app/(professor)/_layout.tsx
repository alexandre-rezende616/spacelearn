// Abas do perfil de professor (Tabs)
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../src/theme/tokens";

export default function ProfessorTabs() {
  return (
    <Tabs
      initialRouteName="painel"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandCyan, // #00CFE5
        tabBarInactiveTintColor: colors.navy800, // #1D1856
        tabBarStyle: { backgroundColor: colors.white },
        tabBarLabelStyle: { fontFamily: "Inter-Medium" },
        sceneContainerStyle: { backgroundColor: colors.bgLight }, // #F2F2F7
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
        name="diario"
        options={{
          title: "Diário",
          tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
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
