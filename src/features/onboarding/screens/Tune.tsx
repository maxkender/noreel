import { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Lock } from 'lucide-react-native';
import Animated, {
  FadeIn, useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { haptics } from '@/lib/haptics';
import { LOGOS } from '@/features/home/AppSlider';
import { useT } from '@/i18n';

/*
 * La table ne porte que des CLES, pas des libelles.
 *
 * Elle vit au niveau du module, ou le dictionnaire n'est pas encore lu : des
 * libelles ecrits ici seraient figes en francais pour tout le monde. Le texte
 * est donc resolu au rendu.
 */
type RowKey = 'reels' | 'ads' | 'stories' | 'dmsOnly' | 'shorts' | 'recommended' | 'comments';
type Row = { key: RowKey; locked?: boolean };

const CARDS: { id: keyof typeof LOGOS; name: string; rows: Row[] }[] = [
  {
    id: 'instagram', name: 'Instagram',
    rows: [
      { key: 'reels', locked: true },
      { key: 'ads' },
      { key: 'stories' },
      { key: 'dmsOnly' },
    ],
  },
  {
    id: 'youtube', name: 'YouTube',
    rows: [
      { key: 'shorts', locked: true },
      { key: 'recommended' },
      { key: 'comments' },
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
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const total = CARDS.reduce((n, card) => n + card.rows.filter((r) => !r.locked).length, 0);
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
      cta={d.tune.tap}
      onPress={onNext}
      tapToContinue
      hintDelay={START + total * STEP + 600}
      hue="deep"
    >
      <Text variant="displayM" style={st.title}>{d.tune.title}</Text>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        {CARDS.map((card, ci) => (
          <Animated.View key={card.id} entering={FadeIn.delay(180 + ci * 160).duration(460)}>
            <Glass radius={22} intensity={45} warmEdge="none" style={st.card}>
              <View style={st.head}>
                <Image source={LOGOS[card.id]} style={st.logo} contentFit="contain" />
                <Text variant="title">{card.name}</Text>
              </View>

              {card.rows.map((r) => {
                const idx = r.locked ? -1 : seen++;
                return (
                  <View key={r.key} style={st.row}>
                    <Text variant="body" tone={r.locked ? 'tertiary' : 'primary'} style={{ flex: 1 }}>
                      {d.tune[r.key]}
                    </Text>
                    {r.locked
                      ? (
                        <View style={st.lockPill}>
                          <Lock size={11} strokeWidth={2.4} color={withAlpha(c.mist, 0.5)} />
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
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
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

const sheet = (c: Palette) => StyleSheet.create({
  title: { textAlign: 'center' },
  card: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingTop: space.lg, paddingBottom: space.md,
  },
  logo: { width: 30, height: 30 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.1),
  },
  lockPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    backgroundColor: withAlpha(c.mist, 0.07),
  },
  track: {
    width: 44, height: 26, borderRadius: 13, padding: 3, overflow: 'hidden',
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.glassEdge,
  },
  trackOn: { backgroundColor: c.accent, borderRadius: 13 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: c.control },
});
