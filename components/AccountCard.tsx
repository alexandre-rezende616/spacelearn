import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { colors, radii, spacing, shadows } from "../src/theme/tokens";
import { fonts, fontSizes } from "../src/theme/typography";

export function AccountCard({
  title = "Minha Conta",
  name,
  email,
  footer,
  style,
}: {
  title?: string;
  name: string | null | undefined;
  email: string | null | undefined;
  footer?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ width: "100%", gap: spacing.lg }, style]}>      
      <Text style={{ fontFamily: fonts.bold, fontSize: fontSizes.h2, color: colors.navy900, textAlign: "center" }}>
        {title}
      </Text>
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

