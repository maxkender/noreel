import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { haptics } from '@/lib/haptics';

const COLOUR = {
  instagram: require('@/assets/apps/instagram.png'),
  tiktok: require('@/assets/apps/tiktok.png'),
  twitter: require('@/assets/apps/twitter.png'),
  youtube: require('@/assets/apps/youtube.png'),
} as const;

// React Native ne sait pas desaturer une image : la version grise est un
// second fichier, et on passe de l'un a l'autre en fondu.
const GREY = {
  instagram: require('@/assets/apps/grey/instagram.png'),
  tiktok: require('@/assets/apps/grey/tiktok.png'),
  twitter: require('@/assets/apps/grey/twitter.png'),
  youtube: require('@/assets/apps/grey/youtube.png'),
} as const;

const APPS = ['instagram', 'tiktok', 'youtube', 'twitter'] as const;
const ICON = 74;
const RADIUS = 96;

const T = {
  in: 620,        // les icones arrivent
  hold: 420,      // on les laisse en couleur
  drain: 260,     // ecart entre deux decolorations
  settle: 420,    // repos une fois tout gris
  zoom: 760,      // l'anneau s'ouvre
  flash: 520,     // la lumiere monte, et couvre
};
const T_DRAIN = T.in + T.hold;
const T_ZOOM = T_DRAIN + APPS.length * T.drain + T.settle;
const T_END = T_ZOOM + T.zoom + T.flash;

/**
 * Le dernier plan de l'onboarding : les apps en couleur, puis vidées de
 * leur couleur une a une, puis l'anneau s'ouvre et laisse passer l'accueil.
 *
 * C'est la promesse jouee plutot que dite — on ne les supprime pas, on leur
 * retire ce qui accroche l'oeil.
 */
export function Finale({ onDone }: { onDone: () => void }) {
  const born = useSharedValue(0);
  const zoom = useSharedValue(0);
  // La lumiere MONTE au lieu que le plan s'efface.
  //
  // Elle s'appelait `veil` et tombait a zero : le dernier plan devenait
  // transparent, et ce qu'il y avait dessous — le paywall, l'ecran d'ou l'on
  // vient — reapparaissait en grand pendant une demi-seconde avant la
  // bascule. On finit donc COUVERT, et c'est l'accueil qui se revele par
  // en dessous une fois la navigation faite.
  const bloom = useSharedValue(0);
  // Un par app, declares un a un : un hook dans une boucle tient tant que
  // la liste ne bouge pas, mais ca ne se voit pas en lisant.
  const d0 = useSharedValue(0);
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);
  const drained = [d0, d1, d2, d3];

  useEffect(() => {
    const E = Easing.bezier(0.16, 1, 0.3, 1);
    born.value = withTiming(1, { duration: T.in, easing: E });

    drained.forEach((v, i) => {
      v.value = withDelay(T_DRAIN + i * T.drain, withTiming(1, { duration: 420 }));
    });

    zoom.value = withDelay(T_ZOOM, withTiming(1, { duration: T.zoom, easing: Easing.in(Easing.cubic) }));
    bloom.value = withDelay(T_ZOOM + T.zoom * 0.7, withTiming(1, { duration: T.flash }));

    const taps = APPS.map((_, i) =>
      setTimeout(() => haptics.tick(), T_DRAIN + i * T.drain)
    );
    const done = setTimeout(onDone, T_END);
    return () => { taps.forEach(clearTimeout); clearTimeout(done); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const light = useAnimatedStyle(() => ({ opacity: bloom.value }));
  const ring = useAnimatedStyle(() => ({
    opacity: born.value * (1 - zoom.value),
    transform: [{ scale: (0.82 + born.value * 0.18) * (1 + zoom.value * 2.4) }],
  }));

  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View style={[styles.ring, ring]}>
        {APPS.map((id, i) => {
          const a = (i / APPS.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <Slot
              key={id}
              id={id}
              drained={drained[i]}
              x={Math.cos(a) * RADIUS}
              y={Math.sin(a) * RADIUS}
            />
          );
        })}
      </Animated.View>

      {/* L'anneau s'ouvre, la lumiere prend toute la place. L'ecran suivant
          arrive derriere elle, jamais devant. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.bloom, light]} />
    </View>
  );
}

function Slot({
  id, drained, x, y,
}: {
  id: keyof typeof COLOUR;
  drained: { value: number };
  x: number;
  y: number;
}) {
  const colour = useAnimatedStyle(() => ({ opacity: 1 - drained.value }));
  const glow = useAnimatedStyle(() => ({
    opacity: (1 - drained.value) * 0.55,
    transform: [{ scale: 1 + (1 - drained.value) * 0.25 }],
  }));

  return (
    <View style={[styles.slot, { transform: [{ translateX: x }, { translateY: y }] }]}>
      <Animated.View style={[styles.glow, glow]} />
      <Image source={GREY[id]} style={styles.icon} contentFit="contain" />
      <Animated.View style={[StyleSheet.absoluteFill, colour]}>
        <Image source={COLOUR[id]} style={styles.icon} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.ground, alignItems: 'center', justifyContent: 'center',
    zIndex: 60,
  },
  ring: { width: RADIUS * 2, height: RADIUS * 2, alignItems: 'center', justifyContent: 'center' },
  slot: {
    position: 'absolute', width: ICON, height: ICON,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { width: ICON, height: ICON },
  bloom: { backgroundColor: colors.night },
  glow: {
    position: 'absolute', width: ICON * 1.5, height: ICON * 1.5,
    borderRadius: ICON, backgroundColor: withAlpha(colors.accent, 0.3),
  },
});
