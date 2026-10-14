import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, FadeIn, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { useColors, type Palette } from '@/theme/useColors';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { Check, Fingerprint } from 'lucide-react-native';
import { HoldRing } from '../scenes/HoldRing';
import { LOGOS } from '@/features/home/AppSlider';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';

type P = { onNext: () => void };

/** Le temps de vouloir, pas celui de cliquer. */
const HOLD_MS = 2400;
/** Le temps de voir Corti rayonner avant que la page tourne. */
const AFTER_MS = 1900;
const RING = 236;
const ORBIT = 138;
const APPS = ['instagram', 'tiktok', 'twitter', 'youtube'] as const;
/** L'instant du maintien ou chaque app lache, l'une apres l'autre. */
const LETGO = [0.22, 0.42, 0.62, 0.82] as const;
/** Ou chacune se tient autour de Corti, en degres. */
const ANGLES = [-135, -45, 45, 135] as const;
/** Les eclats de la fin : douze, en etoile. */
const SPARKS = 12;

/**
 * « Tu es pret ? » — on repond en TENANT, en bas, la ou etait le bouton.
 *
 * Une grande pilule tient lieu de bouton : on pose le doigt dessus et on
 * tient. Un anneau se referme autour de Corti ; les quatre applis, accrochees
 * autour de lui, tremblent de plus en plus fort puis lachent l'une apres
 * l'autre — elles tombent et s'effacent. Le halo monte avec le maintien. On
 * lache avant la fin : tout revient. On tient jusqu'au bout : douze eclats
 * partent en etoile, Corti rayonne, « engagement pris », et la page tourne
 * d'elle-meme apres deux secondes. Tout vit sur le fil d'animation.
 */
export function Ready({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const fill = useSharedValue(0);
  const jolt = useSharedValue(0);
  const burst = useSharedValue(0);
  const press = useSharedValue(0);
  const fired = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clear, []);

  const finish = () => {
    if (fired.current) return;
    fired.current = true;
    setDone(true);
    setHolding(false);
    jolt.value = 0;
    haptics.success();
    burst.value = withSequence(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 900 }));
    timers.current.push(setTimeout(onNext, AFTER_MS));
  };

  const grab = () => {
    if (fired.current) return;
    setHolding(true);
    haptics.press();
    press.value = withTiming(1, { duration: 120 });
    // On repart d'ou en etait l'anneau : lache puis repris, rien ne saute.
    const from = fill.value;
    const left = (1 - from) * HOLD_MS;
    fill.value = withTiming(1, { duration: left, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(finish)();
    });
    // Le tremblement : un aller-retour rapide, sans fin, tant qu'on tient.
    jolt.value = withRepeat(withSequence(withTiming(1, { duration: 45 }), withTiming(-1, { duration: 45 })), -1, true);
    // Un a-coup au moment ou chaque app lache.
    clear();
    LETGO.forEach((at) => {
      if (at <= from) return;
      timers.current.push(setTimeout(() => haptics.tick(), ((at - from) / (1 - from)) * left));
    });
  };

  const release = () => {
    if (fired.current) return;
    setHolding(false);
    clear();
    press.value = withTiming(0, { duration: 160 });
    cancelAnimation(fill);
    cancelAnimation(jolt);
    jolt.value = withTiming(0, { duration: 120 });
    fill.value = withSpring(0, { damping: 16, stiffness: 110 });
  };

  // Le halo derriere Corti grandit avec le maintien, et eclate a la fin.
  const glow = useAnimatedStyle(() => ({
    opacity: 0.22 + fill.value * 0.55 + burst.value * 0.35,
    transform: [{ scale: 0.7 + fill.value * 0.5 + burst.value * 1.1 }],
  }));
  // Corti lui-meme se redresse un peu pendant qu'on tient, et saute a la fin.
  const hero = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + fill.value * 0.08 + burst.value * 0.12 }],
  }));
  // La pilule s'enfonce sous le doigt et se remplit de gauche a droite.
  const pill = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.04 }],
  }));
  const pillFill = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  const hint = done ? d.ready.done : holding ? d.ready.holding : d.ready.hold;

  return (
    <Screen
      center
      still
      hue="accent"
      hueLevel={done ? 1 : 0.3}
      note={(
        <View style={st.holdWrap}>
          <Pressable
            onPressIn={grab}
            onPressOut={release}
            disabled={done}
            accessibilityRole="button"
            accessibilityHint={d.ready.hold}
          >
            <Animated.View style={[st.pill, { borderColor: withAlpha(c.accent, 0.6), backgroundColor: withAlpha(c.accent, 0.12) }, pill]}>
              <Animated.View style={[st.pillFill, { backgroundColor: c.accent }, pillFill]} />
              <Animated.View key={hint} entering={FadeIn.duration(260)}>
                <Text variant="button" color={done ? c.night : c.mist}>{hint}</Text>
              </Animated.View>
            </Animated.View>
          </Pressable>
        </View>
      )}
    >
      <Typewriter text={d.brain.fix} variant="displayM" speed={38} style={st.center} />
      <Animated.View entering={FadeIn.delay(1500).duration(500)}>
        <Text variant="displayM" color={c.accent} style={[st.center, { marginTop: space.sm }]}>
          {d.brain.ready}
        </Text>
      </Animated.View>

      <View style={st.stage} pointerEvents="none">
        <Animated.View style={[st.glow, { backgroundColor: withAlpha(c.accent, 0.45) }, glow]} />
        {Array.from({ length: SPARKS }, (_, i) => <Spark key={i} i={i} burst={burst} colour={i % 3 === 0 ? c.accentWarm : c.accent} />)}
        <Animated.View style={hero}>
          <HoldRing progress={fill} size={RING} stroke={5}>
            {done
              ? <Check size={64} strokeWidth={2.4} color={c.accent} />
              : <Fingerprint size={64} strokeWidth={1.6} color={withAlpha(c.mist, 0.8)} />}
          </HoldRing>
        </Animated.View>
        {APPS.map((id, i) => (
          <Orbit key={id} id={id} i={i} fill={fill} jolt={jolt} />
        ))}
      </View>
    </Screen>
  );
}

/**
 * Une app accrochee autour de Corti, qui tremble puis lache.
 *
 * Elle tremble de plus en plus fort a mesure que l'anneau avance ; passe
 * son instant, elle tombe, tourne, retrecit et s'efface — en un dixieme
 * du maintien. Si l'on lache avant, l'anneau se rouvre et elle revient au
 * meme trajet a l'envers.
 */
function Orbit({
  id, i, fill, jolt,
}: { id: (typeof APPS)[number]; i: number; fill: SharedValue<number>; jolt: SharedValue<number> }) {
  const st = useMemo(() => sheet(null), []);
  const rad = (ANGLES[i] * Math.PI) / 180;
  const x = Math.cos(rad) * ORBIT;
  const y = Math.sin(rad) * ORBIT;
  const style = useAnimatedStyle(() => {
    const gone = Math.min(1, Math.max(0, (fill.value - LETGO[i]) / 0.1));
    const shake = jolt.value * fill.value * 7 * (1 - gone);
    return {
      opacity: 1 - gone,
      transform: [
        { translateX: x + shake },
        { translateY: y + gone * 70 + shake * 0.4 },
        { rotate: `${(i % 2 === 0 ? -1 : 1) * gone * 40}deg` },
        { scale: 1 - gone * 0.6 },
      ],
    };
  });
  return (
    <Animated.View style={[st.icon, style]}>
      <Image source={LOGOS[id]} style={st.logo} contentFit="contain" />
    </Animated.View>
  );
}

/** Un eclat de la fin : il part du centre, en ligne droite, et s'eteint. */
function Spark({ i, burst, colour }: { i: number; burst: SharedValue<number>; colour: string }) {
  const rad = ((i / SPARKS) * 360 * Math.PI) / 180;
  const reach = 150 + (i % 3) * 30;
  const style = useAnimatedStyle(() => {
    const b = burst.value;
    return {
      opacity: b > 0 ? Math.min(1, b * 3) * (1 - b * 0.6) : 0,
      transform: [
        { translateX: Math.cos(rad) * reach * b },
        { translateY: Math.sin(rad) * reach * b },
        { scale: 0.4 + b * 0.9 },
      ],
    };
  });
  return <Animated.View style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colour }, style]} />;
}

const sheet = (c: Palette | null) => StyleSheet.create({
  center: { textAlign: 'center' },
  stage: {
    alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    height: RING + 2 * (ORBIT - RING / 2) + 72, marginTop: space.lg,
  },
  glow: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2 },
  icon: { position: 'absolute', width: 56, height: 56, borderRadius: 14, overflow: 'hidden' },
  logo: { width: 56, height: 56 },
  holdWrap: { paddingHorizontal: gutter, paddingBottom: space.md },
  pill: {
    height: 64, borderRadius: 32, borderWidth: 1.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: c?.accent ?? '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
  },
  pillFill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', transformOrigin: 'left' },
});
