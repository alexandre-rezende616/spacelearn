import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import Logo from '../../components/Logo';
import { colors } from '../../src/theme/tokens';

export default function CoordenadorTabs() {
  return (
    <Tabs
      initialRouteName="painel"
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerStyle: { backgroundColor: colors.bgLight },
        headerShadowVisible: false,
        headerLeft: () => <Logo size={32} background="blue" />,
        tabBarActiveTintColor: colors.brandCyan,
        tabBarInactiveTintColor: colors.navy800,
        tabBarStyle: { backgroundColor: colors.white },
        tabBarLabelStyle: { fontFamily: 'Inter-Medium' },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="painel"
        options={{
          title: 'Painel',
          tabBarIcon: ({ color, size }) => <Ionicons name="analytics" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="missoes"
        options={{
          title: 'Missões',
          tabBarIcon: ({ color, size }) => <Ionicons name="flag" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
