import { View, Text, FlatList } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { colors, spacing, radii } from "../../src/theme/tokens";
import { TopBar } from "../../src/components/TopBar";
import { useUserProgress } from "../../src/store/useUserProgress";

const medals = [
  {
    id: "m1",
    title: "Aprendiz Espacial",
    desc: "Ganhe 50 XP no SpaceLearn",
    requirement: 50,
    iconColor: "#FFD700",
  },
  {
    id: "m2",
    title: "Explorador do Sistema",
    desc: "Complete 3 lições",
    requirement: 3,
    iconColor: "#00CFE5",
  },
  {
    id: "m3",
    title: "Engenheiro de Órbita",
    desc: "Alcance 200 XP",
    requirement: 200,
    iconColor: "#E80074",
  },
  {
    id: "m4",
    title: "Veterano Espacial",
    desc: "Complete 10 lições",
    requirement: 10,
    iconColor: "#1D1856",
  },
];

export default function Medalhas() {
  const { xp, completedLessons } = useUserProgress();

  const data = medals.map((m) => {
    const progress =
      m.id === "m1" || m.id === "m3"
        ? Math.min(xp / m.requirement, 1)
        : Math.min(completedLessons.length / m.requirement, 1);
    const unlocked = progress >= 1;
    return { ...m, progress, unlocked };
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <TopBar />
      <View style={{ padding: spacing.lg }}>
        <Text
          style={{
            fontFamily: "Inter-Bold",
            fontSize: 24,
            color: colors.navy900,
            marginBottom: spacing.md,
            textAlign: "center",
          }}
        >
          🏅 Suas Medalhas
        </Text>

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => (
            <Animated.View
              entering={FadeInUp.duration(400)}
              style={{
                backgroundColor: item.unlocked ? colors.white : "#E0E0E0",
                borderRadius: radii.lg,
                padding: spacing.lg,
                marginBottom: spacing.md,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Svg height={70} width={70}>
                <Circle
                  cx={35}
                  cy={35}
                  r={30}
                  stroke={item.iconColor}
                  strokeWidth="5"
                  fill={item.unlocked ? item.iconColor : "#C6C9D6"}
                />
              </Svg>

              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text
                  style={{
                    fontFamily: "Inter-Bold",
                    fontSize: 18,
                    color: item.unlocked ? colors.navy900 : "#999",
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: item.unlocked ? colors.navy800 : "#999",
                    fontFamily: "Inter-Regular",
                  }}
                >
                  {item.desc}
                </Text>

                <View
                  style={{
                    height: 8,
                    backgroundColor: "#D9D9D9",
                    borderRadius: 8,
                    marginTop: spacing.sm,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${item.progress * 100}%`,
                      height: "100%",
                      backgroundColor: item.iconColor,
                    }}
                  />
                </View>
              </View>
            </Animated.View>
          )}
        />
      </View>
    </View>
  );
}
