import { ActivityIndicator, Image, View } from "react-native";

export default function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F2F2F7",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <Image
        // Project-root alias path
        source={require("@/assets/images/icon.png")}
        style={{ width: 96, height: 96, resizeMode: "contain" }}
      />
      <ActivityIndicator size="large" color="#0A84FF" />
    </View>
  );
}

