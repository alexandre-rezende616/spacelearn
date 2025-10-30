import { ActivityIndicator, View } from "react-native";
import Logo from "../components/Logo";

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
      {/* Use logo configured for white background */}
      <Logo size={96} background="white" />
      <ActivityIndicator size="large" color="#0A84FF" />
    </View>
  );
}
