import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabaseClient";
import { colors, radii, shadows, spacing } from "../../src/theme/tokens";
import { fonts, fontSizes } from "../../src/theme/typography";
import { useAuth } from "../../src/store/useAuth";

type Profile = { nome: string | null };

export default function ContaProfessor() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("nome")
          .eq("id", user.id)
          .maybeSingle();
        setProfile({ nome: (data?.nome as string | null) ?? null });
      } catch {
        setProfile({ nome: null });
      }
    })();
  }, [user?.id]);

  async function handleSignOut() {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.replace("/auth/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg, justifyContent: "center" }}>
      <View
        style={{
          backgroundColor: colors.white,
          padding: spacing.lg,
          borderRadius: radii.lg,
          gap: spacing.md,
          ...shadows.soft,
        }}
      >
        <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.h2, color: colors.navy900, textAlign: "center" }}>
          Minha Conta
        </Text>

        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.navy800 }}>
            {profile?.nome ?? "Sem nome"}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: fontSizes.sm, color: colors.navy800 }}>
            {user?.email ?? "Sem e-mail"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          disabled={loading}
          style={{
            backgroundColor: colors.brandPink, // #E80074
            padding: spacing.lg,
            borderRadius: radii.lg,
          }}
        >
          <Text style={{ color: colors.white, textAlign: "center", fontFamily: fonts.bold, fontSize: fontSizes.md }}>
            Sair
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

