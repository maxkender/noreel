import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { haptics } from '@/lib/haptics';

/**
 * Ouverture : la ligne d'horizon s'etire, l'anneau se leve derriere elle,
 * puis l'ensemble s'efface. Un seul geste, 1,8 s.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const line = useSharedValue(0);
  const rise = useSharedValue(0);
  const out = useSharedValue(0);

  useEffect(() => {
    line.value = withTiming(1, { duration: 620, easing: Easing.bezier(0.16, 1, 0.3, 1) });
    rise.value = withDelay(420, withTiming(1, { duration: 760, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
    out.value = withDelay(
      1400,
      withSequence(withTiming(1, { duration: 420, easing: Easing.in(Easing.quad) }))
    );
    const id = setTimeout(() => { haptics.success(); onDone(); }, 1820);
    return () => clearTimeout(id);
  }, [line, rise, out, onDone]);

  const root = useAnimatedStyle(() => ({ opacity: 1 - out.value }));
  const bar = useAnimatedStyle(() => ({
    width: `${line.value * 62}%`,
    opacity: 0.35 + line.value * 0.65,
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [
      { translateY: (1 - rise.value) * 34 },
      { scale: 0.86 + rise.value * 0.14 },
    ],
  }));

  return (
    <Animated.View style={[styles.root, root]} pointerEvents="none">
      <View style={styles.stage}>
        <Animated.View style={[styles.ring, ring]} />
        {/* La ligne passe DEVANT l'anneau : il se leve derriere l'horizon. */}
        <Animated.View style={[styles.bar, bar]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center',
    zIndex: 50,
  },
  stage: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', bottom: 56,
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 5, borderColor: colors.mist,
  },
  bar: { position: 'absolute', bottom: 56, height: 2, backgroundColor: colors.accent },
});
