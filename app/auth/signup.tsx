import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../src/lib/supabaseClient";
import { colors, radii, spacing } from "../../src/theme/tokens";
import { fonts, fontSizes } from "../../src/theme/typography";

type RoleOption = "aluno" | "professor" | "coordenador";

export default function SignUpScreen() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleOption>("aluno");
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);

  function validateKey() {
    if (role === "aluno" && accessKey !== "ALUNO2025") return false;
    if (role === "professor" && accessKey !== "PROF2025") return false;
    if (role === "coordenador" && accessKey !== "COORD2025") return false;
    return true;
  }

  async function handleSignUp() {
    try {
      if (!validateKey()) {
        Alert.alert("Chave inválida", "Verifique a chave de acesso digitada.");
        return;
      }
      if (!email || !password || !nome) {
        Alert.alert("Campos obrigatórios", "Preencha nome, e-mail e senha.");
        return;
      }

      setLoading(true);
      // armazena o role no metadata do usuário no cadastro
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, nome } },
      });
      if (error) throw error;

      // Se a sessão já estiver ativa, upsert no perfil agora; caso contrário, será feito no login
      const authedUserId = data.session?.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
      if (authedUserId) {
        const { error: upsertErr } = await supabase
          .from("profiles")
          .upsert({ id: authedUserId, nome, role }, { onConflict: "id" });
        if (upsertErr) console.log("Erro ao salvar perfil (signup):", upsertErr.message);
      }

      Alert.alert("Conta criada", "Finalize o login para continuar.");
      router.replace("/auth/login");
    } catch (e: any) {
      Alert.alert("Erro no cadastro", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg, justifyContent: "center" }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.h2, color: colors.navy900, textAlign: "center", marginBottom: spacing.lg }}>
        Criar conta
      </Text>

      <TextInput
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
        style={{
          borderWidth: 1,
          borderColor: colors.navy900,
          padding: spacing.md,
          borderRadius: radii.md,
          marginBottom: spacing.md,
          backgroundColor: colors.white,
          fontFamily: fonts.regular,
        }}
      />

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: colors.navy900,
          padding: spacing.md,
          borderRadius: radii.md,
          marginBottom: spacing.md,
          backgroundColor: colors.white,
          fontFamily: fonts.regular,
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
          marginBottom: spacing.md,
          backgroundColor: colors.white,
          fontFamily: fonts.regular,
        }}
      />

      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
        <TouchableOpacity
          onPress={() => setRole("aluno")}
          style={{
            flex: 1,
            padding: spacing.md,
            borderRadius: radii.md,
            alignItems: "center",
            backgroundColor: role === "aluno" ? colors.brandCyan : colors.white,
            borderWidth: 1,
            borderColor: colors.navy900,
          }}
        >
          <Text style={{ color: role === "aluno" ? colors.white : colors.navy900, fontFamily: fonts.bold }}>
            Aluno
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRole("professor")}
          style={{
            flex: 1,
            padding: spacing.md,
            borderRadius: radii.md,
            alignItems: "center",
            backgroundColor: role === "professor" ? colors.brandPink : colors.white,
            borderWidth: 1,
            borderColor: colors.navy900,
          }}
        >
          <Text style={{ color: role === "professor" ? colors.white : colors.navy900, fontFamily: fonts.bold }}>
            Professor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRole("coordenador")}
          style={{
            flex: 1,
            padding: spacing.md,
            borderRadius: radii.md,
            alignItems: "center",
            backgroundColor: role === "coordenador" ? colors.navy800 : colors.white,
            borderWidth: 1,
            borderColor: colors.navy900,
          }}
        >
          <Text style={{ color: role === "coordenador" ? colors.white : colors.navy900, fontFamily: fonts.bold }}>
            Coordenador
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Chave de acesso"
        value={accessKey}
        onChangeText={setAccessKey}
        style={{
          borderWidth: 1,
          borderColor: colors.navy900,
          padding: spacing.md,
          borderRadius: radii.md,
          marginBottom: spacing.lg,
          backgroundColor: colors.white,
          fontFamily: fonts.regular,
        }}
      />

      <TouchableOpacity
        onPress={handleSignUp}
        disabled={loading}
        style={{
          backgroundColor: colors.navy800,
          padding: spacing.lg,
          borderRadius: radii.lg,
        }}
      >
        <Text style={{ color: colors.white, textAlign: "center", fontFamily: fonts.bold, fontSize: fontSizes.md }}>
          Criar conta
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/auth/login")}
        style={{ marginTop: spacing.md }}
        disabled={loading}
      >
        <Text style={{ textAlign: "center", color: colors.navy900, fontFamily: fonts.regular }}>
          Já tenho conta
        </Text>
      </TouchableOpacity>
    </View>
  );
}
