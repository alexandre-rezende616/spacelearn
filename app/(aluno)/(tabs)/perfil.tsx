import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, radii, shadows, spacing } from "../../../src/theme/tokens";
import { fonts, fontSizes } from "../../../src/theme/typography";
import { useAuth } from "../../../src/store/useAuth";
import { supabase } from "../../../src/lib/supabaseClient";
import AccountCard from "../../../components/AccountCard";

function computeLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

export default function PerfilAluno() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  const [profile, setProfile] = useState<{ nome: string | null; coins: number; xp: number; avatarUrl: string | null; frame: string }>({
    nome: null,
    coins: 0,
    xp: 0,
    avatarUrl: null,
    frame: "default",
  });
  const [completed, setCompleted] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = user?.id;
        if (!id) return;
        const { data } = await supabase
          .from("profiles")
          .select("nome,xp_total,coins_balance,avatar_url,avatar_frame")
          .eq("id", id)
          .maybeSingle();
        if (!mounted) return;
        setProfile({
          nome: (data?.nome as string | null) ?? "Aluno",
          coins: (data?.coins_balance as number | null) ?? 0,
          xp: (data?.xp_total as number | null) ?? 0,
          avatarUrl: (data?.avatar_url as string | null) ?? null,
          frame: (data?.avatar_frame as string | null) ?? "default",
        });
        const { count } = await supabase
          .from("progress")
          .select("id", { count: "exact", head: true })
          .eq("student_id", id)
          .eq("completed", true);
        setCompleted(count ?? 0);
      } catch {
        if (!mounted) return;
        setProfile((prev) => ({ ...prev, nome: prev.nome ?? "Aluno" }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  async function handleLogout() {
    await signOut();
    router.replace("/auth/login");
  }

  async function pickAvatar() {
    if (!user?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Precisamos de acesso às suas fotos para atualizar o avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    try {
      setIsUploading(true);
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileExt = asset.fileName?.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, arrayBuffer, { upsert: true, contentType: asset.mimeType ?? "image/jpeg" });
      if (uploadErr) throw uploadErr;
      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = publicUrl?.publicUrl ?? null;
      const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (updateErr) throw updateErr;
      setProfile((prev) => ({ ...prev, avatarUrl: url }));
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Não foi possível atualizar a foto de perfil.");
    } finally {
      setIsUploading(false);
    }
  }

  const level = computeLevel(profile.xp);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgLight }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <AccountCard
        title="Minha Conta"
        name={profile.nome ?? "Aluno"}
        email={user?.email}
        avatarUrl={profile.avatarUrl}
        frameKey={profile.frame}
        footer={
          <Text style={{ fontFamily: fonts.regular, fontSize: fontSizes.sm, color: colors.navy800 }}>
            {completed} missões concluídas
          </Text>
        }
      />

      <TouchableOpacity
        onPress={pickAvatar}
        disabled={isUploading}
        style={{
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.brandCyan,
          alignSelf: "center",
        }}
      >
        <Text style={{ color: colors.brandCyan, fontFamily: fonts.bold }}>
          {isUploading ? "Enviando..." : "Atualizar foto"}
        </Text>
      </TouchableOpacity>

      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radii.lg,
          padding: spacing.lg,
          gap: spacing.md,
          ...shadows.soft,
        }}
      >
        <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.lg, color: colors.navy900, textAlign: "center" }}>
          Progresso
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.navy900 }}>XP: {profile.xp}</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.navy900 }}>Moedas: {profile.coins}</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.navy900 }}>Nível: {level}</Text>
        </View>
        <Text style={{ textAlign: "center", color: colors.navy800 }}>
          Personalize sua conta na aba <Text style={{ fontFamily: fonts.bold }}>Loja</Text>.
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleLogout}
        style={{
          backgroundColor: colors.brandPink,
          padding: spacing.lg,
          borderRadius: radii.lg,
          width: "100%",
          ...shadows.soft,
        }}
      >
        <Text style={{ color: colors.white, textAlign: "center", fontFamily: fonts.bold, fontSize: fontSizes.md }}>
          Sair da Conta
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
