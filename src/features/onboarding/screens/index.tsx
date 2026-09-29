import { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter, typeDuration } from '@/components/type/Typewriter';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { lifeYears } from '../calculations';


/*
 * Huit heures de travail, posees sur la grille.
 *
 * La grille compte les seize heures eveillees. Sans le travail, la part
 * d'ecran se lit sur une journee entierement disponible — ce que personne n'a.
 * Avec lui, la moitie du tableau est prise d'avance, et le peu qui reste
 * devient le vrai sujet de l'ecran.
 *
 * Huit heures pour tout le monde, et c'est une approximation assumee : la
 * demander ferait un ecran de plus pour affiner un chiffre qui sert a montrer
 * un ordre de grandeur.
 */
const MARK = require('@/assets/brand/mark.png');

type P = { onNext: () => void };

/* ---------- 1 ---------- */
export function S1({ onNext }: P) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  return (
    <Screen cta={d.tapHint} onPress={onNext} center tapToContinue hintDelay={4400} hue="accent">
      <Image source={MARK} style={s.mark} contentFit="contain" />
      <Typewriter text={d.s1.title1} variant="displayL" speed={46} style={s.center} />
      <Typewriter text={d.s1.title2} variant="displayL" speed={46} delay={900} style={s.center} />
    </Screen>
  );
}


/* ---------- Les annees qu'il reste ---------- */

const COLS = 8;
const WORK_GREEN = '#2E9E5B';
type Kind = 'sleep' | 'work' | 'eat' | 'free' | 'phone';

/**
 * Tes annees, une case chacune — et a qui elles vont.
 *
 * Toutes apparaissent d'abord : c'est ce qu'il reste. Puis le sommeil les
 * prend, le travail, les repas, l'une apres l'autre, avec sa ligne. Ce qui
 * reste est le temps libre — et le telephone vient mordre dedans par la
 * fin, en rouge, case par case. La derniere ligne dit ce qui reste de
 * vraiment libre. On ne lit pas un camembert : on regarde ses annees partir.
 */
export function LifeYears({ onNext }: P) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const { width } = useWindowDimensions();
  const age = useOnboardingStore((x) => x.age);
  const minutes = useOnboardingStore(effectiveMinutes);
  const L = useMemo(() => lifeYears(age, minutes), [age, minutes]);
  const title = t(d.life.title, { age, n: L.remaining });

  // La nature de chaque case, decidee une fois : sommeil, travail, repas,
  // puis le libre — et le telephone mord dans le libre PAR LA FIN.
  const kinds = useMemo(() => {
    const k: Kind[] = [];
    (['sleep', 'work', 'eat'] as const).forEach((kind) => { for (let i = 0; i < L[kind]; i += 1) k.push(kind); });
    while (k.length < L.remaining) k.push('free');
    for (let i = 0; i < L.phone; i += 1) k[L.remaining - 1 - i] = 'phone';
    return k;
  }, [L]);

  const [shown, setShown] = useState(0);
  const [painted, setPainted] = useState(0);
  const [phoned, setPhoned] = useState(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tickers: ReturnType<typeof setInterval>[] = [];
    const later = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)); };
    const run = (from: number, to: number, ms: number, set: (n: number) => void, every: number) => {
      let i = from;
      const id = setInterval(() => {
        i += 1;
        set(i);
        if ((i - from) % every === 0) haptics.tick();
        if (i >= to) clearInterval(id);
      }, ms);
      tickers.push(id);
    };
    let at = typeDuration(title, 32, 0) + 300;
    // 1. Les cases, une a une.
    later(at, () => { setStage(1); run(0, L.remaining, 14, setShown, 8); });
    at += L.remaining * 14 + 500;
    // 2-4. Le sommeil, le travail, les repas.
    let upto = 0;
    ([[2, L.sleep], [3, L.work], [4, L.eat]] as const).forEach(([st, n]) => {
      const from = upto;
      upto += n;
      later(at, () => { setStage(st); haptics.tick(); if (n > 0) run(from, from + n, 26, setPainted, 5); });
      at += n * 26 + 650;
    });
    // 5. Ce qui reste : le temps libre.
    later(at, () => { setStage(5); haptics.tick(); });
    at += 900;
    // 6. Le telephone, par la fin.
    later(at, () => { setStage(6); if (L.phone > 0) run(0, L.phone, 55, setPhoned, 3); });
    at += L.phone * 55 + 500;
    // 7. Ce qu'il reste de vraiment libre.
    later(at, () => { setStage(7); haptics.success(); });
    return () => { timers.forEach(clearTimeout); tickers.forEach(clearInterval); };
  }, [L, title]);

  const gap = 6;
  const cell = Math.floor((width - gutter * 2 - (COLS - 1) * gap) / COLS);
  const colour = (i: number): string => {
    if (i >= shown) return 'transparent';
    const k = kinds[i];
    if (k === 'phone' && i >= L.remaining - phoned) return c.danger;
    if (k === 'sleep' && i < painted) return withAlpha(c.accent, 0.6);
    if (k === 'work' && i < painted) return WORK_GREEN;
    if (k === 'eat' && i < painted) return c.ember;
    return withAlpha(c.mist, stage >= 5 ? 0.24 : 0.12);
  };

  const lines: [number, string, string][] = [
    [2, withAlpha(c.accent, 0.6), t(d.life.sleep, { n: L.sleep })],
    [3, WORK_GREEN, t(d.life.work, { n: L.work })],
    [4, c.ember, t(d.life.eat, { n: L.eat })],
    [5, withAlpha(c.mist, 0.35), t(d.life.free, { n: L.free })],
    [6, c.danger, t(d.life.phone, { n: L.phone })],
  ];

  return (
    <Screen
      cta={d.ob.keepGoing}
      onPress={onNext}
      center
      disabled={stage < 7}
      hue="ember"
      hueLevel={Math.min(1, stage / 7)}
    >
      <Typewriter text={title} variant="displayM" style={s.center} />

      <View style={[s.years, { gap }]}>
        {kinds.map((_, i) => (
          <View key={i} style={{ width: cell, height: cell, borderRadius: 5, backgroundColor: colour(i) }} />
        ))}
      </View>

      {/* Les lignes ont une place FIXE : cinq au plus, et rien ne saute. */}
      <View style={s.lines}>
        {lines.map(([at, dot, label]) => (stage >= at ? (
          <Animated.View key={label} entering={FadeInDown.duration(380)} style={s.lineRow}>
            <View style={[s.lineDot, { backgroundColor: dot }]} />
            <Text variant="body" color={at === 6 ? c.danger : undefined} tone={at === 6 ? undefined : 'secondary'}>{label}</Text>
          </Animated.View>
        ) : null))}
      </View>

      <View style={s.leftSlot}>
        {stage >= 7 && (
          <Animated.View entering={FadeIn.duration(600)}>
            <Text variant="displayM" color={c.danger} style={s.center}>
              {L.left > 1 ? t(d.life.left, { n: L.left }) : d.life.leftNone}
            </Text>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  mark: { width: 64, height: 64, alignSelf: 'center', marginBottom: space.xl },
  center: { textAlign: 'center' },
  years: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'stretch', marginTop: space.xl },
  lines: { alignSelf: 'stretch', minHeight: 5 * 30, marginTop: space.lg, gap: 6 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lineDot: { width: 12, height: 12, borderRadius: 3 },
  leftSlot: { minHeight: 80, marginTop: space.md, justifyContent: 'center' },
  // Le halo n'existe que pour ce theme sombre : c.mist sur c.night.
  legacy: { color: withAlpha(c.mist, 0.5) },
});
