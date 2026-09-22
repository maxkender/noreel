import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { haptics } from '@/lib/haptics';

/**
 * Ouverture en quatre temps : la boule nait, respire, l'horizon la traverse,
 * puis elle s'ouvre en grand pour laisser passer le premier ecran.
 * C'est l'ouverture qui donne le ton : elle merite ses 2,6 s.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const born = useSharedValue(0);   // 0 -> 1 : apparition
  const pulse = useSharedValue(0);  // respiration
  const line = useSharedValue(0);   // l'horizon traverse
  const open = useSharedValue(0);   // la boule s'ouvre et avale l'ecran

  useEffect(() => {
    const E = Easing.bezier(0.16, 1, 0.3, 1);

    born.value = withTiming(1, { duration: 700, easing: E });

    pulse.value = withDelay(600, withSequence(
      withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 460, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.6, { duration: 340, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 300, easing: Easing.inOut(Easing.sin) })
    ));

    line.value = withDelay(900, withTiming(1, { duration: 760, easing: E }));
    open.value = withDelay(2000, withTiming(1, { duration: 620, easing: Easing.in(Easing.cubic) }));

    const h1 = setTimeout(() => haptics.tap(), 700);
    const h2 = setTimeout(() => haptics.success(), 2000);
    const end = setTimeout(onDone, 2620);
    return () => { clearTimeout(h1); clearTimeout(h2); clearTimeout(end); };
  }, [born, pulse, line, open, onDone]);

  const root = useAnimatedStyle(() => ({ opacity: 1 - open.value }));

  const ring = useAnimatedStyle(() => {
    const grow = 0.55 + born.value * 0.45 + pulse.value * 0.14;
    // A la fin la boule s'ouvre en grand : on passe au travers.
    const burst = 1 + open.value * 9;
    return {
      opacity: born.value,
      transform: [{ scale: grow * burst }],
      borderWidth: 5 + pulse.value * 2 - open.value * 4.4,
    };
  });

  const halo = useAnimatedStyle(() => ({
    opacity: (0.25 + pulse.value * 0.4) * born.value * (1 - open.value),
    transform: [{ scale: 1 + pulse.value * 0.5 + open.value * 3 }],
  }));

  const bar = useAnimatedStyle(() => ({
    width: `${line.value * 74}%`,
    opacity: line.value * (1 - open.value),
  }));

  return (
    <Animated.View style={[styles.root, root]} pointerEvents="none">
      <View style={styles.stage}>
        <Animated.View style={[styles.halo, halo]} />
        <Animated.View style={[styles.ring, ring]} />
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
  stage: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 76, height: 76, borderRadius: 38,
    borderColor: colors.mist, borderWidth: 5,
  },
  halo: {
    position: 'absolute', width: 76, height: 76, borderRadius: 38,
    backgroundColor: withAlpha(colors.accent, 0.35),
  },
  bar: { position: 'absolute', height: 2, backgroundColor: colors.accent },
});
