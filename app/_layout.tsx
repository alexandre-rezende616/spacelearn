// Root layout com provider de tema e roteamento por perfil
import { Stack, useRouter } from "expo-router";
import { ThemeProvider as NavigationThemeProvider, DefaultTheme } from "@react-navigation/native";
import { useEffect } from "react";
import { supabase } from "../src/lib/supabaseClient";
import { useAuth } from "../src/store/useAuth";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "../src/theme/ThemeProvider";

export default function RootLayout() {
  const { setUser, fetchUser } = useAuth();
  const router = useRouter();

  async function routeByRole(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      const role = (data?.role as "aluno" | "professor" | undefined) ?? "aluno";
      if (error) {
        router.replace("/(aluno)");
        return;
      }
      if (role === "professor") router.replace("/(professor)");
      else router.replace("/(aluno)");
    } catch {
      router.replace("/(aluno)");
    }
  }

  useEffect(() => {
    // Checa sessão inicial e direciona por role
    (async () => {
      await fetchUser();
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (userId) await routeByRole(userId);
      else router.replace("/auth/login");
    })();

    // Ouve mudanças de sessão e direciona por role
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) routeByRole(session.user.id);
      else router.replace("/auth/login");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, setUser, fetchUser]);

  return (
    <ThemeProvider>
      <NavigationThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}

