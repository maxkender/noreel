import { StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';

export type Hue = 'accent' | 'deep' | 'warm' | 'danger' | 'ember';

// Les trois teintes de la marque, plus le rouge et l'orange reserves aux
// moments qui pesent. Changer de teinte d'un ecran a l'autre casse la
// monotonie sans sortir de la palette.
const HUES: Record<Hue, string> = {
  accent: colors.accent,
  deep: colors.accentDeep,
  warm: colors.accentWarm,
  danger: colors.danger,
  ember: colors.ember,
};

/** Halo haut en degrade. Sans Skia : rien a compiler, rien qui puisse tomber. */
export function Glow({ hue = 'accent' }: { hue?: Hue }) {
  const { width } = useWindowDimensions();
  const c = HUES[hue];

  return (
    <Animated.View
      key={hue}
      entering={FadeIn.duration(900)}
      style={[StyleSheet.absoluteFill, { height: width * 0.9 }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[withAlpha(c, 0.18), withAlpha(c, 0.06), 'transparent']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
