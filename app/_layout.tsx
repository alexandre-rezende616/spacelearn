// Root layout com provider de tema e roteamento por perfil
import { Stack, useRouter, useRootNavigationState, type Href } from "expo-router";
import { ThemeProvider as NavigationThemeProvider, DefaultTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabaseClient";
import { useAuth } from "../src/store/useAuth";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { View, StyleSheet } from "react-native";
import LoadingScreen from "./loading";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function RootLayout() {
  const { setUser } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const navState = useRootNavigationState();

  function safeReplace(path: Href) {
    if (!navState?.key) return;
    requestAnimationFrame(() => router.replace(path));
  }

  async function routeByRole(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      let role = (data?.role as "aluno" | "professor" | undefined);

      if (error || !role) role = "aluno"; // fallback

      if (role === "professor") {
        safeReplace("/(professor)");
      } else {
        safeReplace("/(aluno)");
      }
    } catch (err) {
      console.log("Erro ao verificar role:", err);
      safeReplace("/auth/login");
    }
  }

  useEffect(() => {
    if (!navState?.key) return;
    let mounted = true;

    async function initSession() {
      try {
        // verifica sessão inicial
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        const session = data?.session;
        const user = session?.user ?? null;

        setUser(user);

        if (user?.id) {
          await routeByRole(user.id);
        } else {
          safeReplace("/auth/login");
        }
      } catch (err) {
        console.log("Erro na verificação de sessão:", err);
        safeReplace("/auth/login");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSession();

    // ouve mudanças de sessão (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((
      _event: AuthChangeEvent,
      session: Session | null,
    ) => {
      const user = session?.user ?? null;
      setUser(user);

      if (user?.id) routeByRole(user.id);
      else safeReplace("/auth/login");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [navState?.key]);

  return (
    <ThemeProvider>
      <NavigationThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        {isLoading && (
          <View style={StyleSheet.absoluteFillObject}>
            <LoadingScreen />
          </View>
        )}
        <StatusBar style="auto" />
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}
