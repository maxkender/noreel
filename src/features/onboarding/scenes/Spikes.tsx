import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';

const N = 14;
const H = 120;

/**
 * Des pics, encore et encore.
 *
 * « Chaque video declenche une recompense » se lit sans se voir. Ici chaque
 * barre est un pic de dopamine qui monte d'un coup et retombe, jamais en
 * meme temps que ses voisines, sans jamais s'arreter — c'est la repetition
 * qui porte l'idee, et elle ne tient pas dans une phrase.
 *
 * Les durees sont irregulieres sans etre tirees au sort : des pics tous
 * synchrones feraient un egaliseur, pas une avalanche — et un rendu qui
 * tire au sort n'est plus pur, ce qui rend l'ecran different a chaque
 * montage. Trois multiplicateurs premiers suffisent a casser tout motif
 * visible sur quatorze barres.
 */
const SEEDS = Array.from({ length: N }, (_, i) => ({
  up: 160 + ((i * 37) % 140),
  rest: 400 + ((i * 53) % 900),
  wait: (i * 97) % 1200,
}));

export function Spikes() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const seeds = SEEDS;
  return (
    <View style={st.root}>
      {seeds.map((s, i) => <Spike key={i} seed={s} colour={i % 3 === 0 ? c.ember : c.accent} />)}
    </View>
  );
}

function Spike({ seed, colour }: { seed: { up: number; rest: number; wait: number }; colour: string }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const v = useSharedValue(0.12);

  useEffect(() => {
    v.value = withDelay(seed.wait, withRepeat(
      withSequence(
        withTiming(1, { duration: seed.up, easing: Easing.out(Easing.cubic) }),
        withTiming(0.12, { duration: seed.rest, easing: Easing.in(Easing.quad) })
      ), -1, false
    ));
  }, [v, seed]);

  const bar = useAnimatedStyle(() => ({ height: H * v.value, opacity: 0.45 + v.value * 0.55 }));
  return (
    <View style={st.slot}>
      <Animated.View style={[st.bar, bar, { backgroundColor: withAlpha(colour, 0.85) }]} />
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    gap: 5, height: H, marginTop: 22,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(c.mist, 0.25),
  },
  slot: { width: 12, height: H, justifyContent: 'flex-end' },
  bar: { width: 12, borderRadius: 6 },
});
