import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../src/lib/supabaseClient";
import { colors, radii, spacing } from "../../src/theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function getUserRole(userId: string): Promise<"aluno" | "professor"> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (data?.role) return data.role as "aluno" | "professor";
      if (error) console.log("Erro ao buscar role (profiles):", error.message);
      const { data: userData } = await supabase.auth.getUser();
      const metaRole = (userData.user?.user_metadata?.role as "aluno" | "professor" | undefined) ?? "aluno";
      return metaRole;
    } catch (e: any) {
      console.log("Exceção ao buscar role:", e?.message);
      return "aluno";
    }
  }

  async function ensureProfile(userId: string, nome: string | undefined, role: "aluno" | "professor") {
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, role, nome }, { onConflict: "id" });
      if (error) console.log("Erro ao salvar perfil:", error.message);
    } catch (e: any) {
      console.log("Exceção ao salvar perfil:", e?.message);
    }
  }

  async function handleSignIn() {
    try {
      setLoading(true);
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const userId = data.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Não foi possível obter o usuário após login");
      const role = await getUserRole(userId);
      await ensureProfile(userId, email, role);
      console.log("Perfil detectado (login):", role);
      Alert.alert("Login efetuado", `Perfil: ${role}`);
      // Redirecionamento ocorre automaticamente via onAuthStateChange no layout raiz
    } catch (error: any) {
      Alert.alert("Erro no login", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, justifyContent: "center", padding: spacing.lg }}>
      <Text style={{ fontSize: 28, fontFamily: "Inter-Bold", color: colors.navy900, textAlign: "center", marginBottom: spacing.lg }}>
        Bem-vindo(a)
      </Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: colors.navy900,
          padding: spacing.md,
          borderRadius: radii.md,
          marginBottom: spacing.md,
          backgroundColor: colors.white,
        }}
      />

      <TextInput
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: colors.navy900,
          padding: spacing.md,
          borderRadius: radii.md,
          marginBottom: spacing.lg,
          backgroundColor: colors.white,
        }}
      />

      <TouchableOpacity
        onPress={handleSignIn}
        style={{
          backgroundColor: colors.brandCyan,
          padding: spacing.lg,
          borderRadius: radii.lg,
          marginBottom: spacing.sm,
        }}
        disabled={loading}
      >
        <Text style={{ color: colors.white, fontFamily: "Inter-Bold", textAlign: "center" }}>Entrar</Text>
      </TouchableOpacity>

      <View style={{ marginTop: spacing.md }}>
        <Link href="/auth/signup" asChild>
          <TouchableOpacity>
            <Text style={{ textAlign: "center", color: colors.navy900 }}>Criar conta</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

