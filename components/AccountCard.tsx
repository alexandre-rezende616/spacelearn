import React from "react";
import { View, Text, ViewStyle, Image } from "react-native";
import { colors, radii, spacing, shadows } from "../src/theme/tokens";
import { fonts, fontSizes } from "../src/theme/typography";

const FRAME_STYLES: Record<
  string,
  { borderWidth: number; borderColor: string; shadowColor?: string }
> = {
  default: { borderWidth: 2, borderColor: colors.navy800 },
  aurora: { borderWidth: 3, borderColor: "#8B5CF6", shadowColor: "#8B5CF6" },
  nebula: { borderWidth: 3, borderColor: "#F472B6", shadowColor: "#F472B6" },
  galaxy: { borderWidth: 3, borderColor: "#22D3EE", shadowColor: "#22D3EE" },
};

export function AccountCard({
  title = "Minha Conta",
  name,
  email,
  avatarUrl,
  frameKey = "default",
  footer,
  style,
}: {
  title?: string;
  name: string | null | undefined;
  email: string | null | undefined;
  avatarUrl?: string | null;
  frameKey?: string | null | undefined;
  footer?: React.ReactNode;
  style?: ViewStyle;
}) {
  const frame = FRAME_STYLES[frameKey ?? "default"] ?? FRAME_STYLES.default;

  return (
    <View style={[{ width: "100%", gap: spacing.lg }, style]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.h2, color: colors.navy900, textAlign: "center" }}>
        {title}
      </Text>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: frame.borderWidth,
            borderColor: frame.borderColor,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: frame.shadowColor,
            shadowOpacity: frame.shadowColor ? 0.35 : 0,
            shadowRadius: frame.shadowColor ? 8 : 0,
            backgroundColor: colors.bgLight,
          }}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.h1, color: colors.navy900 }}>
              {(name ?? "A").slice(0, 1).toUpperCase()}
            </Text>
          )}
        </View>
      </View>
      <View
        style={{
          width: "100%",
          backgroundColor: colors.white,
          borderRadius: radii.lg,
          padding: spacing.lg,
          gap: spacing.xs,
          ...shadows.soft,
        }}
      >
        <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.navy800 }}>
          {name ?? "—"}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: fontSizes.sm, color: colors.navy800 }}>
          {email ?? "Sem e-mail"}
        </Text>
        {footer}
      </View>
    </View>
  );
}

export default AccountCard;
