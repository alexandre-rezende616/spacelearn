// provider que carrega fontes e controla splash
import { Inter_400Regular, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { ReactNode, useCallback, useEffect } from "react";
import { View } from "react-native";
import { colors } from "./tokens";

// so renderiza conteudo depois das fontes carregarem
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Bold": Inter_700Bold,
    // Quando quiser trocar por TT Norms Pro (licenciada), adicione arquivos .otf em assets/fonts e mapeie aqui.
  });

  // Garante que o splash fique visível até estarmos prontos
  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {
      // evita travar caso a promise rejeite em dev
    });
  }, []);

  // Esconde o splash somente após layout do root e fontes carregadas
  const onLayoutRootView = useCallback(async () => {
    if (loaded) {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // ignora erros de hide em dev
      }
    }
  }, [loaded]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }} onLayout={onLayoutRootView}>
      {loaded ? children : null}
    </View>
  );
}
