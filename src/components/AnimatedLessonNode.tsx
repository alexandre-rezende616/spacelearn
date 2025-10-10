// nodo de missao com animacao de pulso
import { useEffect } from "react";
import { Text, TouchableOpacity } from "react-native";
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { colors, shadows, spacing } from "../theme/tokens";

type LessonProps = {
  title: string;
  status: "locked" | "available" | "done";
  onPress?: () => void;
};

// tamanho padrao do botao circular
const SIZE = 90;

// se status for available o nodo pulsa pra chamar atencao
export function AnimatedLessonNode({ title, status, onPress }: LessonProps) {
  const scale = useSharedValue(1);

  // quando a missão está "available", ela pulsa levemente
  useEffect(() => {
    if (status === "available") {
      scale.value = withRepeat(
        withTiming(1.1, {
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1, // infinito
        true // alterna
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1);
    }
    return () => cancelAnimation(scale);
  }, [status]);

  // estilo animado usando a escala compartilhada
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // cor muda conforme status
  const bgColor =
    status === "done"
      ? colors.brandCyan
      : status === "available"
      ? colors.brandPink
      : "#C6C9D6";

  return (
    <Animated.View style={[animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={status === "locked"}
        onPress={onPress}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: bgColor,
          justifyContent: "center",
          alignItems: "center",
          ...shadows.soft,
        }}
      >
        <Text
          style={{
            color: "white",
            fontFamily: "Inter-Bold",
            textAlign: "center",
            paddingHorizontal: spacing.sm,
          }}
        >
          {title.split(" ")[0]}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
