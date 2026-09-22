import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { haptics } from '@/lib/haptics';

const MARK = require('@/assets/brand/mark.png');

// Le noir avant tout : rien ne bouge, l'oeil se pose.
const HOLD = 520;

/**
 * Ouverture en cinq temps : le noir tient une demi-seconde, puis la boule
 * nait, respire, l'horizon la traverse, et elle s'ouvre en grand pour
 * laisser passer le premier ecran. C'est l'ouverture qui donne le ton :
 * elle merite ses 3,3 s, et elle commence sur du noir pur.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const born = useSharedValue(0);   // 0 -> 1 : apparition
  const pulse = useSharedValue(0);  // respiration
  const line = useSharedValue(0);   // l'horizon traverse
  const open = useSharedValue(0);   // la boule s'ouvre et avale l'ecran

  useEffect(() => {
    const E = Easing.bezier(0.16, 1, 0.3, 1);

    born.value = withDelay(HOLD, withTiming(1, { duration: 820, easing: E }));

    pulse.value = withDelay(HOLD + 700, withSequence(
      withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 460, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.6, { duration: 340, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 300, easing: Easing.inOut(Easing.sin) })
    ));

    line.value = withDelay(HOLD + 1050, withTiming(1, { duration: 880, easing: E }));
    open.value = withDelay(HOLD + 2250, withTiming(1, { duration: 640, easing: Easing.in(Easing.cubic) }));

    const h1 = setTimeout(() => haptics.tap(), HOLD + 700);
    const h2 = setTimeout(() => haptics.success(), HOLD + 2250);
    const end = setTimeout(onDone, HOLD + 2900);
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
    };
  });

  const halo = useAnimatedStyle(() => ({
    opacity: (0.25 + pulse.value * 0.4) * born.value * (1 - open.value),
    transform: [{ scale: 1 + pulse.value * 0.5 + open.value * 3 }],
  }));

  // L'horizon passe sous la marque : un trait, rien de plus.
  const bar = useAnimatedStyle(() => ({
    width: line.value * 190,
    opacity: line.value * (1 - open.value),
  }));

  return (
    <Animated.View style={[styles.root, root]} pointerEvents="none">
      <View style={styles.stage}>
        <Animated.View style={[styles.halo, halo]} />
        <Animated.View style={[styles.ring, ring]}>
          <Image source={MARK} style={styles.mark} contentFit="contain" />
        </Animated.View>
        <Animated.View style={[styles.bar, bar]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.ground, alignItems: 'center', justifyContent: 'center',
    zIndex: 50,
  },
  stage: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  ring: { width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 108, height: 108 },
  halo: {
    position: 'absolute', width: 108, height: 108, borderRadius: 54,
    backgroundColor: withAlpha(colors.accent, 0.35),
  },
  bar: {
    position: 'absolute', top: '50%', height: 2, borderRadius: 1,
    marginTop: 86, backgroundColor: colors.accent,
  },
});
