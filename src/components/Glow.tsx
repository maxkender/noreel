import { StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, withAlpha } from '@/theme/colors';

/** Halo haut en degrade. Sans Skia : rien a compiler, rien qui puisse tomber. */
export function Glow() {
  const { width } = useWindowDimensions();
  return (
    <LinearGradient
      colors={[withAlpha(colors.accent, 0.16), withAlpha(colors.accentWarm, 0.07), 'transparent']}
      locations={[0, 0.5, 1]}
      style={[StyleSheet.absoluteFill, { height: width * 0.9 }]}
      pointerEvents="none"
    />
  );
}
