import { StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';

/** Halo haut en degrade. Sans Skia : rien a compiler, rien qui puisse tomber. */
export function Glow() {
  const { width } = useWindowDimensions();
  return (
    <LinearGradient
      colors={[colors.accentSoft, colors.accentFaint, 'transparent']}
      locations={[0, 0.45, 1]}
      style={[StyleSheet.absoluteFill, { height: width * 0.9 }]}
      pointerEvents="none"
    />
  );
}
