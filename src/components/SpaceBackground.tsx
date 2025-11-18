import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const DEFAULT_COLORS = ['#05040F', '#0B1440', '#020511'];

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: string[];
};

export function SpaceBackground({ children, style, colors = DEFAULT_COLORS }: Props) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
