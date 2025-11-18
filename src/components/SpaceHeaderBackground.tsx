import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

export function SpaceHeaderBackground() {
  return (
    <LinearGradient
      colors={['#05040F', '#0B1440']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
