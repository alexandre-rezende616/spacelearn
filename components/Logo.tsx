import React from "react";
import { Image, ImageStyle } from "react-native";

type Background = "white" | "blue"; // refers to background color to place the logo on
type Orientation = "horizontal" | "vertical";

export function Logo({
  size = 28,
  // Use background-based naming as requested: "branca" for white bg, "azul" for blue bg
  background = "white",
  orientation = "horizontal",
  style,
  // Backwards compat alias: if `variant` is provided, map it to `background`
  variant,
}: {
  size?: number;
  background?: Background;
  orientation?: Orientation;
  style?: ImageStyle | ImageStyle[];
  variant?: "blue" | "white";
}) {
  const bg: Background = (variant as Background) || background;

  const source = (() => {
    if (orientation === "vertical") {
      return bg === "white"
        ? require("@/assets/images/logos/idea space - logo png.png")
        : require("@/assets/images/logos/idea space - logo branca png.png");
    }
    // horizontal
    return bg === "white"
      ? require("@/assets/images/logos/idea space - logo png.png")
      : require("@/assets/images/logos/idea space - logo branca png.png");
  })();

  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style as any]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Logo Idea Space"
    />
  );
}

export default Logo;
