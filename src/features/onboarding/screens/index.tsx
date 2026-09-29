import { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, Extrapolation, FadeIn, FadeInDown, cancelAnimation, interpolate, interpolateColor,
  useAnimatedStyle, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
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

const COLS = 10;
const GAP = 7;
/** Le retrait de la grille dans la page : de l'air autour des cases. */
const INSET = 12;
const WORK_GREEN = '#2E9E5B';
type Kind = 'sleep' | 'work' | 'eat' | 'free' | 'phone';

/** Le tempo, en millisecondes. */
const APPEAR = 16;   // une case de plus
const PAINT = 28;    // une case peinte de plus (sommeil, travail, repas)
const BITE = 80;     // une case mordue de plus (le telephone)
const BEAT = 650;    // le silence entre deux etapes

/**
 * Tes annees, une case chacune — et a qui elles vont.
 *
 * Toutes apparaissent d'abord : c'est ce qu'il reste. Puis le sommeil les
 * prend, le travail, les repas, l'une apres l'autre, avec sa ligne. Puis le
 * telephone vient MORDRE dedans, en rouge, case par case, avec son compte
 * qui monte — c'est le coup. Et seulement a la fin, ce qui reste s'allume :
 * les annees vraiment libres, en une phrase. Le temps libre n'est pas
 * annonce avant : on ne comprend ce qu'il vaut qu'une fois qu'on a vu ce
 * que le telephone en prend.
 *
 * Tout vit sur le fil d'animation. Une seule horloge avance, et chaque case
 * sait a quel instant elle apparait et a quel instant elle change de
 * couleur : React ne rend rien pendant que la grille se peint.
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

  /*
    Le plan de chaque case, calcule une fois : sa nature, l'instant ou elle
    apparait, l'instant ou elle prend sa couleur. Le sommeil, le travail et
    les repas se peignent depuis le debut ; le telephone mord PAR LA FIN ; le
    libre s'allume en dernier.
  */
  const plan = useMemo(() => {
    const kinds: Kind[] = [];
    (['sleep', 'work', 'eat'] as const).forEach((k) => { for (let i = 0; i < L[k]; i += 1) kinds.push(k); });
    while (kinds.length < L.remaining) kinds.push('free');
    for (let i = 0; i < L.phone; i += 1) kinds[L.remaining - 1 - i] = 'phone';

    const t0 = typeDuration(title, 32, 0) + 300;
    const tSleep = t0 + L.remaining * APPEAR + 500;
    const tWork = tSleep + L.sleep * PAINT + BEAT;
    const tEat = tWork + L.work * PAINT + BEAT;
    const tPhone = tEat + L.eat * PAINT + BEAT + 300;
    const tDone = tPhone + L.phone * BITE + 700;

    let painted = 0;
    const cells = kinds.map((kind, i) => {
      let paintAt = Number.MAX_SAFE_INTEGER;
      if (kind === 'sleep') { paintAt = tSleep + painted * PAINT; painted += 1; }
      if (kind === 'work') { paintAt = tWork + (painted - L.sleep) * PAINT; painted += 1; }
      if (kind === 'eat') { paintAt = tEat + (painted - L.sleep - L.work) * PAINT; painted += 1; }
      if (kind === 'phone') paintAt = tPhone + (L.remaining - 1 - i) * BITE;
      return { kind, appearAt: t0 + i * APPEAR, paintAt };
    });
    return { cells, t0, tSleep, tWork, tEat, tPhone, tDone };
  }, [L, title]);

  const clock = useSharedValue(0);
  const [stage, setStage] = useState(0);
  /** Les annees mordues, qui montent avec les cases rouges. */
  const [bitten, setBitten] = useState(0);

  useEffect(() => {
    clock.value = 0;
    clock.value = withTiming(plan.tDone + 400, { duration: plan.tDone + 400, easing: Easing.linear });
    // Les lignes et les tics restent cote React : quelques changements, pas
    // soixante. Un tic toutes les quelques cases pendant qu'elles se posent.
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)); };
    later(plan.t0, () => setStage(1));
    for (let i = 0; i < L.remaining; i += 8) later(plan.t0 + i * APPEAR, () => haptics.tick());
    later(plan.tSleep, () => { setStage(2); haptics.tick(); });
    later(plan.tWork, () => { setStage(3); haptics.tick(); });
    later(plan.tEat, () => { setStage(4); haptics.tick(); });
    later(plan.tPhone, () => { setStage(5); haptics.press(); });
    // Le compte des annees mordues monte case par case, avec un a-coup.
    for (let i = 1; i <= L.phone; i += 1) {
      later(plan.tPhone + (i - 1) * BITE + 120, () => { setBitten(i); if (i % 2 === 0) haptics.tick(); });
    }
    later(plan.tDone, () => { setStage(6); haptics.success(); });
    return () => { timers.forEach(clearTimeout); cancelAnimation(clock); };
  }, [plan, L.remaining, L.phone, clock]);

  const cell = Math.floor((width - gutter * 2 - INSET * 2 - (COLS - 1) * GAP) / COLS);
  const base = withAlpha(c.mist, 0.12);
  const freeTone = withAlpha('#7CF5B0', 0.75);
  const tone: Record<Kind, string> = {
    sleep: withAlpha(c.accent, 0.6), work: WORK_GREEN, eat: c.ember, free: freeTone, phone: c.danger,
  };

  const lines: [number, string, string][] = [
    [2, tone.sleep, t(d.life.sleep, { n: L.sleep })],
    [3, tone.work, t(d.life.work, { n: L.work })],
    [4, tone.eat, t(d.life.eat, { n: L.eat })],
    [5, tone.phone, t(d.life.phone, { n: stage >= 6 ? L.phone : bitten })],
  ];

  return (
    <Screen
      cta={d.ob.keepGoing}
      onPress={onNext}
      center
      disabled={stage < 6}
      hue={stage >= 6 ? 'accent' : 'ember'}
      hueLevel={stage >= 5 ? 1 : Math.min(0.6, stage / 7)}
    >
      <Typewriter text={title} variant="displayM" style={s.center} />

      <View style={[s.years, { gap: GAP, paddingHorizontal: INSET }]}>
        {plan.cells.map((p, i) => (
          <Cell
            key={i}
            size={cell}
            clock={clock}
            appearAt={p.appearAt}
            paintAt={p.paintAt}
            freeAt={p.kind === 'free' ? plan.tDone : Number.MAX_SAFE_INTEGER}
            bite={p.kind === 'phone'}
            base={base}
            free={freeTone}
            colour={tone[p.kind]}
          />
        ))}
      </View>

      {/* Les lignes ont une place FIXE : quatre au plus, et rien ne saute.
          Le telephone est en rouge, et son compte monte sous les yeux. */}
      <View style={s.lines}>
        {lines.map(([at, dot, label]) => (stage >= at ? (
          <Animated.View key={at} entering={FadeInDown.duration(380)} style={s.lineRow}>
            <View style={[s.lineDot, { backgroundColor: dot }]} />
            <Text
              variant={at === 5 ? 'title' : 'body'}
              color={at === 5 ? c.danger : undefined}
              tone={at === 5 ? undefined : 'secondary'}
            >
              {label}
            </Text>
          </Animated.View>
        ) : null))}
      </View>

      {/* Le libre, et seulement a la fin : ce qu'il reste une fois que tout
          le monde s'est servi. */}
      <View style={s.leftSlot}>
        {stage >= 6 && (
          <Animated.View entering={FadeIn.duration(700)}>
            <Text variant="displayM" color={freeTone} style={s.center}>
              {L.left > 1 ? t(d.life.left, { n: L.left }) : d.life.leftNone}
            </Text>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

/**
 * Une case, qui lit l'horloge.
 *
 * Elle apparait en grandissant a son instant, prend sa couleur au sien, et
 * — si elle est libre — s'eclaircit quand on nomme le temps libre. Tout est
 * calcule sur le fil d'animation a partir d'une seule valeur partagee.
 */
function Cell({
  size, clock, appearAt, paintAt, freeAt, bite = false, base, free, colour,
}: {
  size: number;
  clock: SharedValue<number>;
  appearAt: number;
  paintAt: number;
  freeAt: number;
  /** Une case que le telephone mord : elle saute plus fort en changeant. */
  bite?: boolean;
  base: string;
  free: string;
  colour: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = clock.value;
    const born = interpolate(t, [appearAt, appearAt + 260], [0, 1], Extrapolation.CLAMP);
    const lit = interpolate(t, [freeAt, freeAt + 400], [0, 1], Extrapolation.CLAMP);
    const paint = interpolate(t, [paintAt, paintAt + 220], [0, 1], Extrapolation.CLAMP);
    const resting = interpolateColor(lit, [0, 1], [base, free]);
    // La case peinte gonfle a peine au moment ou elle change : c'est ce
    // qui fait sentir que quelque chose vient d'etre pris.
    const pop = paint > 0 && paint < 1 ? 1 + (bite ? 0.45 : 0.18) * Math.sin(paint * Math.PI) : 1;
    return {
      opacity: born,
      backgroundColor: interpolateColor(paint, [0, 1], [resting, colour]),
      transform: [{ scale: (0.55 + 0.45 * born) * pop }],
    };
  });
  return <Animated.View style={[{ width: size, height: size, borderRadius: Math.max(4, size / 4) }, style]} />;
}

/**
 * Le chiffre des cases, seul et en grand : les annees sur le telephone,
 * sur celles qu'il reste. Il monte au lieu de s'afficher — c'est le trajet
 * qui fait mal, pas la valeur finale. Le meme calcul que la grille, pour
 * que les deux ecrans disent la meme chose.
 */
export function S6Years({ onNext }: P) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const age = useOnboardingStore((x) => x.age);
  const minutes = useOnboardingStore(effectiveMinutes);
  const L = useMemo(() => lifeYears(age, minutes), [age, minutes]);
  const [y, setY] = useState(0);

  useEffect(() => {
    // 1,6 s quel que soit le chiffre : un petit nombre ne doit pas defiler
    // plus vite qu'un grand.
    const steps = 34;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setY(Math.round((L.phone * i) / steps));
      if (i % 8 === 0) haptics.tick();
      if (i >= steps) clearInterval(id);
    }, 1600 / steps);
    return () => clearInterval(id);
  }, [L.phone]);

  return (
    <Screen cta={d.misc.reclaim} onPress={onNext} center hue="ember">
      <Animated.View entering={FadeIn.duration(700)} style={s.yearsBlock}>
        <Text variant="label" tone="tertiary">{t(d.s6.lifeOf, { n: L.remaining })}</Text>
        <Text variant="hero" color={c.danger} style={s.center} numberOfLines={1} adjustsFontSizeToFit>
          {t(d.s6.years, { y })}
        </Text>
        <Text variant="lead" tone="secondary" style={s.center}>{d.s6.bodyShort}</Text>
      </Animated.View>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  yearsBlock: { alignItems: 'center', gap: space.xs },
  mark: { width: 64, height: 64, alignSelf: 'center', marginBottom: space.xl },
  center: { textAlign: 'center' },
  years: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignSelf: 'stretch', marginTop: space.xl },
  lines: { alignSelf: 'stretch', minHeight: 4 * 32, marginTop: space.lg, gap: 6 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lineDot: { width: 12, height: 12, borderRadius: 3 },
  leftSlot: { minHeight: 80, marginTop: space.md, justifyContent: 'center' },
  // Le halo n'existe que pour ce theme sombre : c.mist sur c.night.
  legacy: { color: withAlpha(c.mist, 0.5) },
});
