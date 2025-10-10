// iuri meu bem tela de jogo de uma licao com pergunta e feedback
import { createAudioPlayer } from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, radii, spacing } from "../../../src/theme/tokens";
import { useUserProgress } from "../../../src/store/useUserProgress";

// Pergunta exemplo
// pergunta de exemplo por enquanto fixa
const q = {
  prompt: "Qual e a funcao do painel solar em um satélite?",
  options: [
    "Reduzir o arrasto atmosferico",
    "Gerar energia eletrica a partir da luz solar",
    "Garantir comunicacao com a Terra",
    "Controlar a orientacao do satelite",
  ],
  answerIndex: 1,
};

// pega o id da licao da rota e controla estado de resposta
export default function PlayLesson() {
  const params = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const lessonId = Array.isArray(params.lessonId)
    ? params.lessonId?.[0]
    : params.lessonId ?? "001";
  const router = useRouter();

  // store global
  const addCoins = useUserProgress((s) => s.addCoins);
  const addXP = useUserProgress((s) => s.addXP);
  const completeLesson = useUserProgress((s) => s.completeLesson);

  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);

  // animacao de feedback (shake)
  const feedback = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: feedback.value }],
  }));

  // toca som de acerto ou erro e descarrega depois
  async function playSound(isCorrect: boolean) {
    try {
      const file = isCorrect
        ? require("../../../assets/sounds/correct.mp3")
        : require("../../../assets/sounds/wrong.mp3");
      const player = createAudioPlayer(file);
      player.play();
      setTimeout(() => {
        try {
          player.remove();
        } catch {}
      }, 800);
    } catch (err) {
      console.log("Erro ao tocar som:", err);
    }
  }

  // evita toques repetidos e atualiza progresso
  function handleAnswer(index: number) {
    if (correct !== null) return; // evita multiplos toques

    setSelected(index);
    const isCorrect = index === q.answerIndex;
    setCorrect(isCorrect);

    if (isCorrect) {
      feedback.value = withSequence(
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0)
      );
      addCoins(10);
      addXP(5);
      completeLesson(String(lessonId));
    } else {
      feedback.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0)
      );
    }

    playSound(isCorrect);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg }}>
      <Text
        style={{
          color: colors.navy900,
          fontFamily: "Inter-Bold",
          fontSize: 22,
          textAlign: "center",
        }}
      >
        Licao {lessonId}
      </Text>

      <Animated.View
        style={[
          {
            marginTop: spacing.lg,
            backgroundColor: colors.white,
            borderRadius: radii.lg,
            padding: spacing.lg,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 6,
          },
          animatedStyle,
        ]}
      >
        <Text
          style={{
            fontFamily: "Inter-Bold",
            color: colors.navy800,
            fontSize: 18,
            marginBottom: spacing.lg,
            textAlign: "center",
          }}
        >
          {q.prompt}
        </Text>

        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isRight = !!correct && i === q.answerIndex;
          const bg =
            correct === null
              ? colors.white
              : isRight
              ? "#00D07B"
              : isSelected
              ? "#FF6B6B"
              : colors.white;

          return (
            <TouchableOpacity
              key={i}
              onPress={() => handleAnswer(i)}
              style={{
                borderWidth: 2,
                borderColor: isSelected ? colors.brandCyan : colors.bgLight,
                borderRadius: radii.md,
                backgroundColor: bg,
                padding: spacing.md,
                marginBottom: spacing.sm,
              }}
            >
              <Text
                style={{
                  color: colors.navy800,
                  fontFamily: "Inter-Regular",
                  textAlign: "center",
                }}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {correct && (
        <Animated.View
          entering={FadeIn.duration(600).easing(Easing.out(Easing.ease))}
          style={{
            alignItems: "center",
            marginTop: spacing.lg,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter-Bold",
              fontSize: 18,
              color: colors.brandCyan,
            }}
          >
            +10 moedas +5 XP
          </Text>
        </Animated.View>
      )}

      {correct !== null && (
        <TouchableOpacity
          onPress={() => {
            if (correct) {
              router.back();
            } else {
              setSelected(null);
              setCorrect(null);
            }
          }}
          style={{
            backgroundColor: correct ? colors.brandCyan : colors.brandPink,
            padding: spacing.lg,
            borderRadius: radii.lg,
            marginTop: "auto",
          }}
        >
          <Text
            style={{
              color: colors.white,
              fontFamily: "Inter-Bold",
              textAlign: "center",
              fontSize: 16,
            }}
          >
            {correct ? "Concluir Missao" : "Tentar novamente"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
