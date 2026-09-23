import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Lock } from 'lucide-react-native';
import Animated, {
  FadeIn, useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { haptics } from '@/lib/haptics';
import { LOGOS } from '@/features/home/AppSlider';

type Row = { label: string; locked?: boolean };

const CARDS: { id: keyof typeof LOGOS; name: string; rows: Row[] }[] = [
  {
    id: 'instagram', name: 'Instagram',
    rows: [
      { label: 'Bloquer les Reels', locked: true },
      { label: 'Masquer les publicités' },
      { label: 'Masquer les stories' },
      { label: 'Messages uniquement' },
    ],
  },
  {
    id: 'youtube', name: 'YouTube',
    rows: [
      { label: 'Bloquer les Shorts', locked: true },
      { label: 'Masquer les suggestions' },
      { label: 'Bloquer les commentaires' },
    ],
  },
];

// Un interrupteur toutes les 420 ms, apres une seconde de pose.
const START = 1000;
const STEP = 420;

/**
 * Demonstration, pas formulaire : les interrupteurs s'allument SEULS, l'un
 * apres l'autre. On montre ce que l'app sait regler avant de demander quoi
 * que ce soit — personne ne parametre une app qu'il ne connait pas encore.
 */
export function Tune({ onNext }: P) {
  const total = CARDS.reduce((n, c) => n + c.rows.filter((r) => !r.locked).length, 0);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const ids = Array.from({ length: total }, (_, i) =>
      setTimeout(() => { haptics.tick(); setLit(i + 1); }, START + i * STEP)
    );
    return () => ids.forEach(clearTimeout);
  }, [total]);

  let seen = 0;

  return (
    <Screen
      cta="Appuie pour continuer"
      onPress={onNext}
      tapToContinue
      hintDelay={START + total * STEP + 600}
      hue="deep"
    >
      <Text variant="displayM" style={st.title}>Règle tout, ligne par ligne.</Text>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        {CARDS.map((c, ci) => (
          <Animated.View key={c.id} entering={FadeIn.delay(180 + ci * 160).duration(460)}>
            <Glass radius={22} intensity={45} warmEdge="none" style={st.card}>
              <View style={st.head}>
                <Image source={LOGOS[c.id]} style={st.logo} contentFit="contain" />
                <Text variant="title">{c.name}</Text>
              </View>

              {c.rows.map((r) => {
                const idx = r.locked ? -1 : seen++;
                return (
                  <View key={r.label} style={st.row}>
                    <Text variant="body" tone={r.locked ? 'tertiary' : 'primary'} style={{ flex: 1 }}>
                      {r.label}
                    </Text>
                    {r.locked
                      ? (
                        <View style={st.lockPill}>
                          <Lock size={11} strokeWidth={2.4} color={withAlpha(colors.mist, 0.5)} />
                          <Text variant="label" tone="tertiary">Toujours</Text>
                        </View>
                      )
                      : <Switch on={idx < lit} />}
                  </View>
                );
              })}
            </Glass>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

/** Le meme interrupteur que dans l'app, mais personne ne le touche ici. */
function Switch({ on }: { on: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withSpring(on ? 1 : 0, springs.snappy); }, [on, v]);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * 18 }] }));
  const fill = useAnimatedStyle(() => ({ opacity: v.value }));

  return (
    <View style={st.track}>
      <Animated.View style={[StyleSheet.absoluteFill, st.trackOn, fill]} />
      <Animated.View style={[st.knob, knob]} />
    </View>
  );
}

type P = { onNext: () => void };

const st = StyleSheet.create({
  title: { textAlign: 'center' },
  card: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingTop: space.lg, paddingBottom: space.md,
  },
  logo: { width: 30, height: 30 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(colors.mist, 0.1),
  },
  lockPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    backgroundColor: withAlpha(colors.mist, 0.07),
  },
  track: {
    width: 44, height: 26, borderRadius: 13, padding: 3, overflow: 'hidden',
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.18),
  },
  trackOn: { backgroundColor: colors.accent, borderRadius: 13 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.mist },
});
