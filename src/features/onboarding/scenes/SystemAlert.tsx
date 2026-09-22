import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat,
  withSequence, withTiming,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';

// Geometrie d'une UIAlertController sur iPhone : 270 pt de large, centree
// dans la fenetre, boutons de 44 pt cote a cote. Ces valeurs ne dependent
// pas du modele — c'est ce qui permet de poser la maquette exactement la
// ou la vraie alerte apparaitra, sur n'importe quel telephone.
const W = 270;
const BTN_H = 44;

/**
 * Maquette de l'alerte systeme. Le bouton a presser est ici au pixel pres
 * la ou sera celui de la vraie alerte : le doigt n'a pas a se deplacer, et
 * personne ne tape le bouton bleu par reflexe.
 */
export function SystemAlert({
  title, body, good, bad, goodSide = 'left', onGood, onBad,
}: {
  title: string;
  body: string;
  good: string;
  bad: string;
  goodSide?: 'left' | 'right';
  onGood: () => void;
  onBad?: () => void;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(900, withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ), -1, false
    ));
  }, [pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.55,
    transform: [{ scale: 1 + pulse.value * 0.03 }],
  }));

  const buttons: { label: string; on: boolean }[] = goodSide === 'left'
    ? [{ label: good, on: true }, { label: bad, on: false }]
    : [{ label: bad, on: false }, { label: good, on: true }];

  return (
    <View style={st.layer} pointerEvents="box-none">
      <Animated.View entering={FadeIn.delay(350).duration(520)} style={st.alert}>
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={st.tint} />

        <View style={st.copy}>
          <Text variant="title" style={st.title}>{title}</Text>
          <Text variant="body" tone="secondary" style={st.body}>{body}</Text>
        </View>

        <View style={st.sep} />
        <View style={st.row}>
          {buttons.map((b, i) => (
            <View key={b.label} style={st.cell}>
              {i === 1 && <View style={st.vsep} />}
              <Pressable
                onPress={() => { haptics.press(); (b.on ? onGood : onBad ?? onGood)(); }}
                style={st.btn}
                accessibilityRole="button"
              >
                <Text
                  variant={b.on ? 'button' : 'body'}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  color={b.on ? colors.mist : withAlpha('#5A8CFF', 0.65)}
                >
                  {b.label}
                </Text>
              </Pressable>
              {/* Le halo ne designe que le bon bouton. */}
              {b.on && (
                <Animated.View style={[st.ring, ring]} pointerEvents="none" />
              )}
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(1200).duration(600)}
        style={[st.arrow, goodSide === 'right' && st.arrowRight]}
        pointerEvents="none"
      >
        <Svg width={120} height={92} viewBox="0 0 120 92">
          <Path d="M96 84 C 72 66, 40 58, 22 18" stroke={colors.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M22 18 L 20 38 M22 18 L 40 26" stroke={colors.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  layer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  alert: {
    width: W, borderRadius: 14, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.1),
  },
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(38,38,42,0.86)',
  },
  copy: { paddingHorizontal: 16, paddingTop: 19, paddingBottom: 16, gap: 4 },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', lineHeight: 18 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(colors.mist, 0.18) },
  row: { flexDirection: 'row', height: BTN_H },
  cell: { flex: 1 },
  vsep: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: StyleSheet.hairlineWidth, backgroundColor: withAlpha(colors.mist, 0.18),
    zIndex: 2,
  },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  ring: {
    position: 'absolute', top: 2, left: 4, right: 4, bottom: 2, borderRadius: 10,
    borderWidth: 2, borderColor: colors.accent,
  },
  // Sous l'alerte, pointant vers le bouton de gauche.
  arrow: { position: 'absolute', marginTop: 250, marginLeft: -110 },
  arrowRight: { transform: [{ scaleX: -1 }], marginLeft: 110 },
});
