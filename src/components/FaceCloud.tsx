import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { useReducedMotion } from '@/lib/useReducedMotion';

/*
 * Les visages de la communaute, qui derivent doucement.
 *
 * Ils sont RONDS et ils bougent chacun a son rythme. Une grille de portraits
 * carres et immobiles se lit comme une page d'equipe ; des ronds qui flottent
 * se lisent comme des gens. C'est la meme information et ce n'est pas le meme
 * sentiment, et c'est tout ce qu'on demande a cet ecran.
 *
 * Aucun nom, aucun chiffre, aucun temoignage : ce sont des visages, pas des
 * preuves. Inventer « douze mille membres » ou une citation sous un portrait
 * serait fabriquer ce qu'on n'a pas encore.
 */

const FACES = [
  require('@/assets/faces/face-1.webp'),
  require('@/assets/faces/face-2.webp'),
  require('@/assets/faces/face-3.webp'),
  require('@/assets/faces/face-4.webp'),
  require('@/assets/faces/face-5.webp'),
  require('@/assets/faces/face-6.webp'),
  require('@/assets/faces/face-7.webp'),
  require('@/assets/faces/face-8.webp'),
];

/**
 * Ou chaque visage se pose, en part de la largeur et de la hauteur, avec sa
 * taille. Disposes a la main : une repartition calculee donne un cercle
 * regulier, qu'on lit comme un diagramme.
 */
const SPOTS: { x: number; y: number; d: number }[] = [
  { x: 0.06, y: 0.10, d: 54 },
  { x: 0.74, y: 0.04, d: 46 },
  { x: 0.40, y: 0.00, d: 40 },
  { x: 0.00, y: 0.52, d: 44 },
  { x: 0.80, y: 0.44, d: 58 },
  { x: 0.16, y: 0.76, d: 48 },
  { x: 0.56, y: 0.80, d: 52 },
  { x: 0.86, y: 0.78, d: 38 },
];

/** Le nuage. Il remplit la boite qu'on lui donne. */
export function FaceCloud({ height = 300 }: { height?: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  return (
    <View style={[st.root, { height }]} pointerEvents="none">
      {SPOTS.map((spot, i) => (
        <Face key={i} spot={spot} index={i} source={FACES[i]} />
      ))}
    </View>
  );
}

function Face({
  spot, index, source,
}: {
  spot: { x: number; y: number; d: number };
  index: number;
  source: ReturnType<typeof require>;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const reduced = useReducedMotion();
  const drift = useSharedValue(0.5);

  useEffect(() => {
    if (reduced) { drift.value = 0.5; return; }
    /*
      Chaque visage a sa propre duree, et aucune n'est un multiple d'une
      autre : sinon ils repassent tous par la meme position et le nuage se
      met a respirer d'un seul bloc.
    */
    drift.value = withRepeat(
      withTiming(1, {
        duration: 3400 + index * 430,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [reduced, index, drift]);

  // Un sens de derive par visage : les pairs montent, les impairs descendent,
  // et l'amplitude change pour qu'aucun couple ne soit parallele.
  const way = index % 2 === 0 ? 1 : -1;
  const amp = 6 + (index % 3) * 4;

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: (drift.value - 0.5) * amp * 2 * way },
      { translateX: (drift.value - 0.5) * amp * way * -0.6 },
      { scale: 0.97 + drift.value * 0.06 },
    ],
  }));

  return (
    <Animated.View
      style={[
        st.face,
        {
          left: `${spot.x * 100}%`,
          top: `${spot.y * 100}%`,
          width: spot.d,
          height: spot.d,
          borderRadius: spot.d / 2,
        },
        style,
      ]}
    >
      <Image source={source} style={st.photo} contentFit="cover" transition={320} />
    </Animated.View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { alignSelf: 'stretch' },
  face: {
    position: 'absolute', overflow: 'hidden',
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.2),
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  photo: { width: '100%', height: '100%' },
});
