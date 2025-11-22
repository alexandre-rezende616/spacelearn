import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, TouchableOpacity, type GestureResponderEvent } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';

type Props = {
  label: string;
  icon?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

export function SpaceButton({ label, icon, onPress, disabled, variant = 'primary' }: Props) {
  const background =
    variant === 'primary'
      ? colors.brandCyan
      : variant === 'secondary'
      ? 'transparent'
      : colors.brandCyan;
  const borderColor = variant === 'secondary' ? colors.brandCyan : 'transparent';
  const textColor = variant === 'secondary' ? colors.brandCyan : colors.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.lg,
        backgroundColor: background,
        borderWidth: 1,
        borderColor,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon}
      <Text style={{ color: textColor, fontFamily: 'Inter-Bold' }}>{label}</Text>
    </TouchableOpacity>
  );
}
