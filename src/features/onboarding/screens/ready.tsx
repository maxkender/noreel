import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, FadeIn, ZoomIn, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue,
  withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { useColors } from '@/theme/useColors';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { CortiRig } from '@/components/CortiRig';
import { LOGOS } from '@/features/home/AppSlider';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';

type P = { onNext: () => void };

/** Le temps de vouloir, pas celui de cliquer. */
const HOLD_MS = 2600;
const APPS = ['instagram', 'tiktok', 'twitter', 'youtube'] as const;

/**
 * « Tu es pret ? » — on repond en TENANT, et on voit ce que ca fait.
 *
 * Les quatre applis sont la, en icones. On appuie n'importe ou et on
 * tient : une vague de couleur monte du bas de l'ecran, et les icones
 * tombent l'une apres l'autre — elles basculent, retrecissent, s'effacent.
 * On lache avant la fin : la vague redescend, les icones remontent. On
 * tient jusqu'au bout : il ne reste que la couleur, et Corti rayonnant
 * arrive dedans. Tout vit sur le fil d'animation, image par image.
 */
export function Ready({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const { height } = useWindowDimensions();
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const fill = useSharedValue(0);
  const fired = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const finish = () => {
    if (fired.current) return;
    fired.current = true;
    setDone(true);
    haptics.success();
    // Corti a le temps d'arriver avant qu'on tourne la page.
    timer.current = setTimeout(onNext, 1100);
  };

  const grab = () => {
    if (fired.current) return;
    setHolding(true);
    haptics.press();
    // On repart d'ou en etait la vague : lache puis repris, rien ne saute.
    const from = fill.value;
    fill.value = withTiming(1, { duration: (1 - from) * HOLD_MS, easing: Easing.inOut(Easing.quad) }, (finished) => {
      if (finished) runOnJS(finish)();
    });
  };

  const release = () => {
    if (fired.current) return;
    setHolding(false);
    cancelAnimation(fill);
    fill.value = withSpring(0, { damping: 14, stiffness: 120 });
  };

  // La vague : un degrade plein ecran qui monte du bas avec le maintien.
  const wave = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - fill.value) * height }],
  }));

  return (
    <Screen center still hue="accent">
      <Pressable
        onPressIn={grab}
        onPressOut={release}
        style={st.press}
        accessibilityRole="button"
        accessibilityHint={d.ready.hold}
      >
        <Animated.View style={[st.wave, { left: -gutter, right: -gutter }, wave]} pointerEvents="none">
          <LinearGradient
            colors={[withAlpha(c.accent, 0), withAlpha(c.accent, 0.55), c.accent]}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Typewriter text={d.brain.fix} variant="displayM" speed={38} style={st.center} />
        <Animated.View entering={FadeIn.delay(1500).duration(500)}>
          <Text variant="displayM" color={c.accent} style={[st.center, { marginTop: space.sm }]}>
            {d.brain.ready}
          </Text>
        </Animated.View>

        <View style={st.stage}>
          {done ? (
            <Animated.View entering={ZoomIn.springify().damping(12)}>
              <CortiRig level={3} size={200} expression="ravi" arrive />
            </Animated.View>
          ) : (
            APPS.map((id, i) => <Falling key={id} id={id} i={i} fill={fill} />)
          )}
        </View>

        <Animated.View entering={FadeIn.delay(2400).duration(600)}>
          <Text variant="label" tone="tertiary" style={st.center}>
            {holding ? d.ready.holding : d.ready.hold}
          </Text>
        </Animated.View>
      </Pressable>
    </Screen>
  );
}

/**
 * Une icone qui tombe avec le maintien.
 *
 * Chacune part a son tour — un cinquieme de trajet d'ecart — et met un peu
 * moins de la moitie du trajet a disparaitre : elle bascule, retrecit,
 * s'efface. La valeur partagee est lue sur le fil d'animation, jamais
 * recalculee par React.
 */
function Falling({ id, i, fill }: { id: (typeof APPS)[number]; i: number; fill: SharedValue<number> }) {
  const st = useMemo(() => sheet(), []);
  const style = useAnimatedStyle(() => {
    const start = i * 0.16;
    const local = Math.min(1, Math.max(0, (fill.value - start) / 0.4));
    return {
      opacity: 1 - local,
      transform: [
        { translateY: local * 180 },
        { rotate: `${(i % 2 === 0 ? -1 : 1) * local * 55}deg` },
        { scale: 1 - local * 0.5 },
      ],
    };
  });
  return (
    <Animated.View style={[st.icon, style]}>
      <Image source={LOGOS[id]} style={st.logo} contentFit="contain" />
    </Animated.View>
  );
}

const sheet = () => StyleSheet.create({
  // Toute la page est la zone de prise : on n'a pas a viser.
  press: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', overflow: 'hidden' },
  wave: { position: 'absolute', top: 0, bottom: 0 },
  center: { textAlign: 'center' },
  stage: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.md, height: 220, marginVertical: space.xl,
  },
  icon: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden' },
  logo: { width: 64, height: 64 },
});
