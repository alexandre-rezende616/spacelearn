﻿// Abas do perfil de professor (Tabs)
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../src/theme/tokens";
import Logo from "../../components/Logo";

export default function ProfessorTabs() {
  return (
    <Tabs
      initialRouteName="painel"
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerStyle: { backgroundColor: colors.bgLight },
        headerShadowVisible: false,
        // Use logo configured for white background, slightly larger
        headerRight: () => <Logo size={32} background="white" />,
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
          title: "MissÃµes",
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
          title: "DiÃ¡rio",
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

