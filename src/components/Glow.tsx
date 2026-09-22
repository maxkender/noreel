import { StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import Animated, {
  Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
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

/**
 * Halo haut en degrade. Sans Skia : rien a compiler, rien qui puisse tomber.
 *
 * Il part du bord haut de l'ecran, DERRIERE la barre de progression : une
 * version posee dans le contenu laissait un trait de couleur net juste sous
 * elle.
 */
export function Glow({ hue = 'accent', level = 0 }: { hue?: Hue; level?: number }) {
  const { width } = useWindowDimensions();
  const c = HUES[hue];
  const t = useSharedValue(level);

  useEffect(() => {
    t.value = withTiming(level, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [level, t]);

  // `level` monte l'intensite sans changer la teinte : le rouge des ecrans
  // qui pesent grandit au fil des etapes.
  const anim = useAnimatedStyle(() => ({ opacity: 0.55 + t.value * 0.45 }));
  const extra = useAnimatedStyle(() => ({ opacity: t.value }));

  return (
    <Animated.View
      key={hue}
      entering={FadeIn.duration(900)}
      style={[StyleSheet.absoluteFill, { height: width * 1.15 }]}
      pointerEvents="none"
    >
      <Animated.View style={[StyleSheet.absoluteFill, anim]}>
        <LinearGradient
          colors={[withAlpha(c, 0.18), withAlpha(c, 0.06), 'transparent']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, extra]}>
        <LinearGradient
          colors={[withAlpha(c, 0.26), withAlpha(c, 0.08), 'transparent']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}
