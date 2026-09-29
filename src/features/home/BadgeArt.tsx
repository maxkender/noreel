import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import Reanimated, { withTiming } from 'react-native-reanimated';

/*
 * Les badges du studio : dix medaillons de verre bleu, et leur version
 * verrouillee, grise. Decoupes de la planche par scripts/slice-badges.py.
 */
export const BADGE_ART: Record<string, { on: number; off: number }> = {
  day1: { on: require('@/assets/badges/day1.png'), off: require('@/assets/badges/day1-locked.png') },
  day7: { on: require('@/assets/badges/day7.png'), off: require('@/assets/badges/day7-locked.png') },
  day30: { on: require('@/assets/badges/day30.png'), off: require('@/assets/badges/day30-locked.png') },
  day100: { on: require('@/assets/badges/day100.png'), off: require('@/assets/badges/day100-locked.png') },
  reels100: { on: require('@/assets/badges/reels100.png'), off: require('@/assets/badges/reels100-locked.png') },
  reels1000: { on: require('@/assets/badges/reels1000.png'), off: require('@/assets/badges/reels1000-locked.png') },
  reels10000: { on: require('@/assets/badges/reels10000.png'), off: require('@/assets/badges/reels10000-locked.png') },
  care1: { on: require('@/assets/badges/care1.png'), off: require('@/assets/badges/care1-locked.png') },
  care10: { on: require('@/assets/badges/care10.png'), off: require('@/assets/badges/care10-locked.png') },
  care3: { on: require('@/assets/badges/care3.png'), off: require('@/assets/badges/care3-locked.png') },
};

/** L'apparition d'un badge qu'on vient de gagner : il grandit, sans rebondir. */
function pop() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.6 }] },
    animations: {
      opacity: withTiming(1, { duration: 300 }),
      transform: [{ scale: withTiming(1, { duration: 420 }) }],
    },
  };
}

/**
 * Un medaillon.
 *
 * Gagne, il FLOTTE — trois points de haut en bas, lentement, chacun a son
 * rythme. Rien derriere lui : la lueur qui respirait sous chaque medaillon
 * faisait des taches qui flottaient, et on regardait les taches. Verrouille,
 * il est gris et immobile : c'est ce qui donne envie de l'allumer.
 */
export function BadgeArt({
  id, on, size = 56, big = false, index = 0,
}: {
  id: string;
  on: boolean;
  size?: number;
  /** En grand, dans une fenetre : il arrive en grandissant. */
  big?: boolean;
  /** Decale le flottement d'un medaillon a l'autre. */
  index?: number;
}) {
  const [phase] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!on) return;
    const up = Animated.timing(phase, { toValue: 1, duration: 1500 + index * 120, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    const down = Animated.timing(phase, { toValue: 0, duration: 1500 + index * 120, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([Animated.delay(index * 180), up, down]));
    loop.start();
    return () => loop.stop();
  }, [on, phase, index]);

  const art = BADGE_ART[id];
  const body = (
    <Animated.View
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        on && {
          transform: [
            { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
            { scale: phase.interpolate({ inputRange: [0, 1], outputRange: [1, big ? 1.04 : 1.02] }) },
          ],
        },
      ]}
    >
      <Image source={on ? art.on : art.off} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
  if (!big) return body;
  return <Reanimated.View entering={pop}>{body}</Reanimated.View>;
}

