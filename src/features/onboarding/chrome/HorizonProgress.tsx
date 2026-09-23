import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { springs } from '@/theme/motion';

/** La progression EST une ligne d'horizon : un soleil avance dessus (§6). */
export function HorizonProgress({ step, total }: { step: number; total: number }) {
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);
  const ratio = total > 1 ? step / (total - 1) : 0;

  const sun = useAnimatedStyle(() => ({
    left: withSpring(`${ratio * 100}%`, springs.gentle),
  }));
  const lit = useAnimatedStyle(() => ({
    width: withSpring(`${ratio * 100}%`, springs.gentle),
  }));

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel={`Étape ${step + 1} sur ${total}`}
    >
      <View style={styles.line} />
      <Animated.View style={[styles.lineLit, lit]} />
      <Animated.View style={[styles.sunWrap, sun]}>
        <View style={styles.halo} />
        <View style={styles.sun} />
      </Animated.View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { height: 12, justifyContent: 'center' },
  line: { height: 1, backgroundColor: withAlpha(c.mist, 0.18) },
  lineLit: {
    position: 'absolute', height: 1, backgroundColor: withAlpha(c.mist, 0.6),
  },
  sunWrap: { position: 'absolute', marginLeft: -6, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute', width: 16, height: 16, borderRadius: 8,
    backgroundColor: withAlpha(c.sun, 0.3),
  },
  sun: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.sun },
});
