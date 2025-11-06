import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { colors, radii, shadows, spacing } from "../../src/theme/tokens";
import { fonts, fontSizes } from "../../src/theme/typography";
import { supabase } from "../../src/lib/supabaseClient";
import { useAuth } from "../../src/store/useAuth";

type FrameOption = { key: string; name: string; description: string; cost: number };

const FRAME_OPTIONS: FrameOption[] = [
  { key: "default", name: "Padrão", description: "Visual básico", cost: 0 },
  { key: "aurora", name: "Aurora", description: "Borda violeta brilhante", cost: 200 },
  { key: "nebula", name: "Nébula", description: "Brilho rosa espacial", cost: 400 },
  { key: "galaxy", name: "Galáxia", description: "Ciano estelar", cost: 600 },
];

export default function LojaAluno() {
  const user = useAuth((s) => s.user);
  const [coins, setCoins] = useState(0);
  const [currentFrame, setCurrentFrame] = useState<string>("default");
  const [unlockedFrames, setUnlockedFrames] = useState<Set<string>>(new Set(["default"]));
  const [loading, setLoading] = useState(false);

  async function loadStore() {
    const userId = user?.id;
    if (!userId) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("coins_balance, avatar_frame")
        .eq("id", userId)
        .maybeSingle();
      setCoins((profile?.coins_balance as number | null) ?? 0);
      setCurrentFrame((profile?.avatar_frame as string | null) ?? "default");

      const { data: purchases } = await supabase
        .from("cosmetic_purchases")
        .select("item_key")
        .eq("profile_id", userId);

      const unlocked = new Set<string>(["default"]);
      (purchases ?? []).forEach((row: any) => {
        if (row.item_key) unlocked.add(row.item_key as string);
      });
      setUnlockedFrames(unlocked);
    } catch (error: any) {
      Alert.alert("Erro", error?.message ?? "Não foi possível carregar a loja.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStore();
  }, [user?.id]);

  async function equipFrame(option: FrameOption) {
    const userId = user?.id;
    if (!userId) return;
    if (option.key === currentFrame) return;

    const unlocked = unlockedFrames.has(option.key);

    async function updateFrame(newFrame: string, newCoins: number) {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_frame: newFrame, coins_balance: newCoins })
        .eq("id", userId);
      if (error) throw error;
      setCurrentFrame(newFrame);
      setCoins(newCoins);
    }

    try {
      if (!unlocked) {
        if (coins < option.cost) {
          Alert.alert("Moedas insuficientes", "Conclua mais missões para ganhar moedas.");
          return;
        }
        const { error: purchaseError } = await supabase
          .from("cosmetic_purchases")
          .insert({ profile_id: userId, item_key: option.key, coins_spent: option.cost });
        if (purchaseError) throw purchaseError;

        await updateFrame(option.key, coins - option.cost);
        setUnlockedFrames((prev) => new Set(prev).add(option.key));
      } else {
        await updateFrame(option.key, coins);
      }
      Alert.alert("Pronto!", `Borda "${option.name}" equipada.`);
    } catch (error: any) {
      Alert.alert("Erro", error?.message ?? "Não foi possível aplicar a borda.");
      await loadStore();
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgLight }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.lg, color: colors.navy900 }}>Loja Cósmica</Text>
        <Text style={{ marginTop: spacing.xs, color: colors.navy800 }}>
          Use suas moedas para desbloquear bordas especiais e personalizar sua foto de perfil.
        </Text>
        <Text style={{ marginTop: spacing.md, fontFamily: fonts.bold, color: colors.brandCyan }}>
          Moedas disponíveis: {coins}
        </Text>
      </View>

      {FRAME_OPTIONS.map((option) => {
        const unlocked = unlockedFrames.has(option.key);
        const isActive = option.key === currentFrame;
        return (
          <View
            key={option.key}
            style={{
              backgroundColor: colors.white,
              borderRadius: radii.lg,
              padding: spacing.lg,
              gap: spacing.sm,
              ...shadows.soft,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.navy900 }}>
                  {option.name}
                </Text>
                <Text style={{ color: colors.navy800 }}>{option.description}</Text>
              </View>
              <Text style={{ fontFamily: fonts.bold, color: colors.brandCyan }}>
                {option.cost} moedas
              </Text>
            </View>
            <TouchableOpacity
              disabled={loading}
              onPress={() => equipFrame(option)}
              style={{
                backgroundColor: isActive ? colors.brandPink : unlocked ? colors.brandCyan : colors.navy800,
                paddingVertical: spacing.sm,
                borderRadius: radii.md,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.white, fontFamily: fonts.bold }}>
                {isActive ? "Equipado" : unlocked ? "Equipar" : "Comprar"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}
