import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, FadeIn, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { useColors } from '@/theme/useColors';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { CortiRig } from '@/components/CortiRig';
import { HoldRing } from '../scenes/HoldRing';
import { LOGOS } from '@/features/home/AppSlider';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';

type P = { onNext: () => void };

/** Le temps de vouloir, pas celui de cliquer. */
const HOLD_MS = 2400;
const RING = 236;
const ORBIT = 138;
const APPS = ['instagram', 'tiktok', 'twitter', 'youtube'] as const;
/** L'instant du maintien ou chaque app lache, l'une apres l'autre. */
const LETGO = [0.22, 0.42, 0.62, 0.82] as const;
/** Ou chacune se tient autour de Corti, en degres. */
const ANGLES = [-135, -45, 45, 135] as const;

/**
 * « Tu es pret ? » — on repond en TENANT Corti.
 *
 * Un anneau se referme autour de lui pendant qu'on tient. Les quatre applis
 * sont autour, accrochees ; a mesure que l'anneau avance, elles tremblent,
 * puis lachent l'une apres l'autre — elles tombent et s'effacent. On lache
 * avant la fin : l'anneau se rouvre, les applis reviennent. On tient
 * jusqu'au bout : Corti rayonne, et l'ecran ATTEND — le bouton s'allume, il
 * ne tourne pas la page tout seul. Tout vit sur le fil d'animation.
 */
export function Ready({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const fill = useSharedValue(0);
  const jolt = useSharedValue(0);
  const burst = useSharedValue(0);
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
    burst.value = withSequence(withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 700 }));
  };

  const grab = () => {
    if (fired.current) return;
    setHolding(true);
    haptics.press();
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
    cancelAnimation(fill);
    cancelAnimation(jolt);
    jolt.value = withTiming(0, { duration: 120 });
    fill.value = withSpring(0, { damping: 16, stiffness: 110 });
  };

  // Le halo derriere Corti grandit avec le maintien, et eclate a la fin.
  const glow = useAnimatedStyle(() => ({
    opacity: 0.25 + fill.value * 0.55 + burst.value * 0.3,
    transform: [{ scale: 0.7 + fill.value * 0.5 + burst.value * 0.9 }],
  }));

  const hint = done ? d.ready.done : holding ? d.ready.holding : d.ready.hold;

  return (
    <Screen center still hue="accent" hueLevel={done ? 1 : 0.3} cta={d.ob.keepGoing} onPress={onNext} disabled={!done}>
      <Typewriter text={d.brain.fix} variant="displayM" speed={38} style={st.center} />
      <Animated.View entering={FadeIn.delay(1500).duration(500)}>
        <Text variant="displayM" color={c.accent} style={[st.center, { marginTop: space.sm }]}>
          {d.brain.ready}
        </Text>
      </Animated.View>

      <Pressable
        onPressIn={grab}
        onPressOut={release}
        style={st.stage}
        accessibilityRole="button"
        accessibilityHint={d.ready.hold}
        disabled={done}
      >
        <Animated.View style={[st.glow, { backgroundColor: withAlpha(c.accent, 0.45) }, glow]} pointerEvents="none" />
        <HoldRing progress={fill} size={RING} stroke={5}>
          <CortiRig level={3} size={150} expression={done ? 'ravi' : 'auto'} />
        </HoldRing>
        {APPS.map((id, i) => (
          <Orbit key={id} id={id} i={i} fill={fill} jolt={jolt} />
        ))}
      </Pressable>

      <View style={st.hintSlot}>
        <Animated.View key={hint} entering={FadeIn.duration(320)}>
          <Text variant={done ? 'lead' : 'label'} color={done ? c.accent : undefined} tone={done ? undefined : 'tertiary'} style={st.center}>
            {hint}
          </Text>
        </Animated.View>
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
 * meme trajet a l'envers. Tout est lu sur le fil d'animation.
 */
function Orbit({
  id, i, fill, jolt,
}: { id: (typeof APPS)[number]; i: number; fill: SharedValue<number>; jolt: SharedValue<number> }) {
  const st = useMemo(() => sheet(), []);
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
    <Animated.View style={[st.icon, style]} pointerEvents="none">
      <Image source={LOGOS[id]} style={st.logo} contentFit="contain" />
    </Animated.View>
  );
}

const sheet = () => StyleSheet.create({
  center: { textAlign: 'center' },
  stage: {
    alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    height: RING + 2 * (ORBIT - RING / 2) + 72, marginTop: space.lg,
  },
  glow: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2 },
  icon: { position: 'absolute', width: 56, height: 56, borderRadius: 14, overflow: 'hidden' },
  logo: { width: 56, height: 56 },
  hintSlot: { height: 56, justifyContent: 'center', marginTop: space.sm },
});
