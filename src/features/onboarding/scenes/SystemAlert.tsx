import { useMemo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat,
  withSequence, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';

// Geometrie d'une UIAlertController sur iPhone : 270 pt de large, centree
// dans la fenetre, boutons de 44 pt cote a cote, separateurs fins, titre a
// 17 pt et message a 13 pt. Ces valeurs ne dependent pas du modele — c'est
// ce qui permet de poser la maquette exactement la ou la vraie alerte
// apparaitra, sur n'importe quel telephone.
const W = 270;
const BTN_H = 44;
const IOS_BLUE = '#0A84FF';   // couleur des actions en mode sombre

/**
 * Maquette de l'alerte systeme, au plus pres de celle d'Apple : meme
 * largeur, meme materiau, memes tailles de texte, et les DEUX actions en
 * bleu — c'est ainsi qu'iOS les dessine.
 *
 * Comme rien ne distingue alors le bon bouton, une pulsation et une fleche
 * le designent. Le doigt se pose au bon endroit avant meme que la vraie
 * alerte s'ouvre, et elle s'ouvre exactement dessous.
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
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 40 }),
        withTiming(0, { duration: 520 })
      ), -1, false
    ));
  }, [pulse]);

  // L'onde part du bouton et s'evanouit : le geste est montre, pas decrit.
  const ripple = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.5,
    transform: [{ scale: 0.6 + pulse.value * 0.55 }],
  }));
  const lift = useAnimatedStyle(() => ({
    opacity: 0.25 + (1 - pulse.value) * 0.35,
  }));

  const buttons: { label: string; on: boolean }[] = goodSide === 'left'
    ? [{ label: good, on: true }, { label: bad, on: false }]
    : [{ label: bad, on: false }, { label: good, on: true }];

  return (
    <View style={st.layer} pointerEvents="box-none">
      <Animated.View entering={FadeIn.delay(300).duration(520)} style={st.alert}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={st.material} />

        <View style={st.copy}>
          <Text variant="title" style={st.title}>{title}</Text>
          <Text variant="body" style={st.body} tone="primary">{body}</Text>
        </View>

        <View style={st.sep} />
        <View style={st.row}>
          {buttons.map((b, i) => (
            <View key={b.label} style={st.cell}>
              {i === 1 && <View style={st.vsep} />}

              {b.on && (
                <>
                  <Animated.View style={[st.ripple, ripple]} pointerEvents="none" />
                  <Animated.View style={[st.lift, lift]} pointerEvents="none" />
                </>
              )}

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
                  color={IOS_BLUE}
                  style={st.action}
                >
                  {b.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(1100).duration(600)}
        style={[st.arrow, goodSide === 'right' && st.arrowRight]}
        pointerEvents="none"
      >
        <Svg width={120} height={92} viewBox="0 0 120 92">
          <Path d="M96 84 C 72 66, 40 58, 22 18" stroke={c.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M22 18 L 20 38 M22 18 L 40 26" stroke={c.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  layer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  alert: { width: W, borderRadius: 14, overflow: 'hidden' },
  // Le materiau d'iOS en mode sombre : presque opaque, legerement froid.
  material: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(30,30,32,0.82)',
  },
  copy: { paddingHorizontal: 16, paddingTop: 19, paddingBottom: 18, gap: 4 },
  title: { textAlign: 'center', fontSize: 17, lineHeight: 22 },
  body: { textAlign: 'center', fontSize: 13, lineHeight: 17 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(c.mist, 0.22) },
  row: { flexDirection: 'row', height: BTN_H },
  cell: { flex: 1, overflow: 'hidden' },
  vsep: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: StyleSheet.hairlineWidth, backgroundColor: withAlpha(c.mist, 0.22),
    zIndex: 2,
  },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  action: { fontSize: 17, lineHeight: 22 },
  lift: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(c.accent, 0.2),
  },
  ripple: {
    position: 'absolute', alignSelf: 'center', top: -22,
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2, borderColor: c.accent,
  },
  // Sous l'alerte, pointant vers le bouton de gauche.
  arrow: { position: 'absolute', marginTop: 250, marginLeft: -110 },
  arrowRight: { transform: [{ scaleX: -1 }], marginLeft: 110 },
});
