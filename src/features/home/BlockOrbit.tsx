import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, FadeIn, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { Lock, LockOpen } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter } from '@/theme/spacing';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { APPS, LOGOS } from './AppSlider';

const MARK = require('@/assets/brand/mark.png');

/**
 * LE SCHEMA DU BLOCAGE.
 *
 * UnSwipe au centre, les quatre apps d'origine autour, reliees a lui par un
 * fil. Un cadenas sur chacune dit d'un coup d'oeil si elle est bloquee — et
 * donc si on passe par UnSwipe. C'est l'etat de la page, dessine plutot
 * qu'ecrit.
 */
export function BlockOrbit({ blocked }: { blocked: boolean }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { width } = useWindowDimensions();
  const W = width - gutter * 2;
  const H = Math.round(W * 0.78);
  const R = Math.round(W * 0.34);
  const ICON = Math.round(W * 0.2);
  const CENTER = Math.round(W * 0.26);
  const reduced = useReducedMotion();
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    breathe.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(breathe);
  }, [breathe, reduced]);

  const glow = useAnimatedStyle(() => ({
    opacity: 0.35 + breathe.value * 0.25,
    transform: [{ scale: 1 + breathe.value * 0.08 }],
  }));

  // Quatre places, en diagonale : l'oeil lit un cercle sans qu'on le dessine.
  const angles = [-135, -45, 135, 45];
  const tone = blocked ? c.accent : withAlpha(c.mist, 0.35);

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }}>
      {APPS.map((a, i) => {
        const rad = (angles[i] * Math.PI) / 180;
        const x = W / 2 + R * Math.cos(rad);
        const y = H / 2 + R * Math.sin(rad) * 0.86;
        const dx = x - W / 2;
        const dy = y - H / 2;
        const len = Math.sqrt(dx * dx + dy * dy);
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <View
            key={`line-${a.id}`}
            pointerEvents="none"
            style={[st.line, {
              width: len, left: W / 2, top: H / 2, backgroundColor: withAlpha(tone, blocked ? 0.45 : 0.25),
              transformOrigin: '0% 50%', transform: [{ rotate: `${deg}deg` }],
            }]}
          />
        );
      })}

      <Animated.View
        pointerEvents="none"
        style={[st.glow, glow, {
          width: CENTER * 1.9, height: CENTER * 1.9, borderRadius: CENTER,
          left: W / 2 - CENTER * 0.95, top: H / 2 - CENTER * 0.95,
          backgroundColor: withAlpha(blocked ? c.accent : c.mist, 0.18),
        }]}
      />
      <View style={[st.center, { width: CENTER, height: CENTER, borderRadius: CENTER * 0.26, left: W / 2 - CENTER / 2, top: H / 2 - CENTER / 2 }]}>
        <Image source={MARK} style={{ width: CENTER * 0.6, height: CENTER * 0.6 }} contentFit="contain" />
      </View>

      {APPS.map((a, i) => {
        const rad = (angles[i] * Math.PI) / 180;
        const x = W / 2 + R * Math.cos(rad);
        const y = H / 2 + R * Math.sin(rad) * 0.86;
        return (
          <Animated.View
            key={a.id}
            entering={FadeIn.delay(80 + i * 70).duration(320)}
            style={{ position: 'absolute', left: x - ICON / 2, top: y - ICON / 2 }}
          >
            <Image source={LOGOS[a.id]} style={{ width: ICON, height: ICON }} contentFit="contain" />
            <View style={[st.badge, { backgroundColor: blocked ? c.accent : c.glassSolid, borderColor: blocked ? c.accent : c.glassEdge }]}>
              {blocked
                ? <Lock size={12} strokeWidth={2.6} color={c.night} />
                : <LockOpen size={12} strokeWidth={2.4} color={withAlpha(c.mist, 0.8)} />}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  line: { position: 'absolute', height: 1.5, borderRadius: 1 },
  glow: { position: 'absolute' },
  center: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000', borderWidth: 1, borderColor: c.glassEdge,
  },
  badge: {
    position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
});
