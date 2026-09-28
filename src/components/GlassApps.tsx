import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { LOGOS } from '@/features/home/AppSlider';

/*
 * Les quatre apps, en tuiles de verre qui flottent.
 *
 * Le paywall dit ce qu'on obtient en quatre lignes ; il ne montre jamais SUR
 * QUOI. Les logos disent en une image ce qu'aucune liste ne dit aussi vite —
 * et posees en verre au-dessus du degrade, elles donnent a l'ecran la
 * profondeur qui lui manquait.
 *
 * Elles derivent chacune a son rythme : quatre tuiles immobiles font un
 * bandeau de logos, quatre tuiles qui flottent font un objet.
 */

const APPS = ['instagram', 'tiktok', 'twitter', 'youtube'] as const;

/** Ou chaque tuile se pose, et sa taille. Disposees a la main. */
const SPOTS: { x: number; y: number; d: number; tilt: number }[] = [
  { x: 0.02, y: 0.12, d: 54, tilt: -9 },
  { x: 0.70, y: 0.00, d: 46, tilt: 7 },
  { x: 0.18, y: 0.62, d: 42, tilt: 11 },
  { x: 0.78, y: 0.56, d: 50, tilt: -6 },
];

export function GlassApps({ height = 132 }: { height?: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={[st.root, { height }]} pointerEvents="none">
      {APPS.map((id, i) => (
        <Tile key={id} id={id} spot={SPOTS[i]} index={i} />
      ))}
    </View>
  );
}

function Tile({
  id, spot, index,
}: {
  id: (typeof APPS)[number];
  spot: { x: number; y: number; d: number; tilt: number };
  index: number;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const reduced = useReducedMotion();
  const drift = useSharedValue(0.5);

  useEffect(() => {
    if (reduced) { drift.value = 0.5; return; }
    // Des durees qui ne se divisent pas : sinon les quatre repassent ensemble
    // par la meme position et le groupe se met a respirer d'un bloc.
    drift.value = withRepeat(
      withTiming(1, { duration: 3100 + index * 470, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [reduced, index, drift]);

  const way = index % 2 === 0 ? 1 : -1;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: (drift.value - 0.5) * 14 * way },
      { rotate: `${spot.tilt + (drift.value - 0.5) * 3 * way}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        st.tile,
        {
          left: `${spot.x * 100}%`,
          top: `${spot.y * 100}%`,
          width: spot.d,
          height: spot.d,
          borderRadius: spot.d * 0.28,
        },
        style,
      ]}
    >
      <BlurView intensity={38} tint="light" style={StyleSheet.absoluteFill} />
      <View style={st.frost} />
      <Image source={LOGOS[id]} style={st.logo} contentFit="contain" />
    </Animated.View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { alignSelf: 'stretch' },
  tile: {
    position: 'absolute', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha('#FFFFFF', 0.35),
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  // Un voile clair par-dessus le flou : sans lui, le verre prend la couleur du
  // degrade et les logos s'y perdent.
  frost: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha('#FFFFFF', 0.12),
  },
  logo: { width: '58%', height: '58%' },
});
