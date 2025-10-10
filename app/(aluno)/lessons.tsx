// iuri meu bem tela do mapa de missoes em zigzag
import { useRouter } from "expo-router";
import { Dimensions, FlatList, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { AnimatedLessonNode } from "../../src/components/AnimatedLessonNode";
import { TopBar } from "../../src/components/TopBar";
import { colors, spacing } from "../../src/theme/tokens";

// usamos a largura da tela pra desenhar as linhas
const { width } = Dimensions.get("window");
const NODE_SIZE = 90;

// lista das missoes com status
const lessons = [
  { id: "001", title: "Ambiente Espacial", status: "available" },
  { id: "002", title: "Riscos e EPIs", status: "locked" },
  { id: "003", title: "Componentes do Satélite", status: "locked" },
  { id: "004", title: "Design Thinking", status: "locked" },
  { id: "005", title: "Missão Final", status: "locked" },
];

// renderiza lista com nodes e linhas conectando
export default function LessonsMap() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <TopBar coins={120} streak={5} />

      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: spacing.lg }}
        renderItem={({ item, index }) => {
          const isLeft = index % 2 === 0;
          const nextItem = lessons[index + 1];
          const isLast = index === lessons.length - 1;

          return (
            <View
              style={{
                alignItems: isLeft ? "flex-start" : "flex-end",
                width: "100%",
                paddingHorizontal: spacing.lg,
              }}
            >
              <AnimatedLessonNode
                title={item.title}
                status={item.status as any}
                onPress={() =>
                  item.status === "available" &&
                  router.push(`/(aluno)/play/${item.id}`)
                }
              />

              {/* linhas entre nós */}
              {!isLast && (
                <Svg
                  height={100}
                  width={width - 100}
                  style={{
                    marginLeft: isLeft ? NODE_SIZE / 1.5 : 0,
                    alignSelf: isLeft ? "flex-start" : "flex-end",
                  }}
                >
                  <Line
                    x1={isLeft ? 0 : width - 180}
                    y1="0"
                    x2={isLeft ? width - 180 : 0}
                    y2="100"
                    stroke={colors.navy800}
                    strokeWidth="4"
                    strokeDasharray="8"
                  />
                </Svg>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
