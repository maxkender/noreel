import { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, Extrapolation, FadeIn, FadeInDown, cancelAnimation, interpolate, interpolateColor, type SharedValue, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming,
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
import { freeShare, lifeYears } from '../calculations';
import { LOGOS } from '@/features/home/AppSlider';


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
  // L'invite arrive des que la seconde ligne a fini de s'ecrire.
  const typed = typeDuration(d.s1.title1, 46, 0) + 900 + typeDuration(d.s1.title2, 46, 0) + 150;
  return (
    <Screen cta={d.tapHint} onPress={onNext} center tapToContinue hintDelay={typed} readyAfter={typed} hue="accent" backdrop={<Drift />}>
      <Image source={MARK} style={s.mark} contentFit="contain" />
      <Typewriter text={d.s1.title1} variant="displayL" speed={46} style={s.center} />
      <Typewriter text={d.s1.title2} variant="displayL" speed={46} delay={900} style={s.center} />
    </Screen>
  );
}


/*
 * Les icones des quatre apps, petites, qui derivent un peu partout.
 *
 * « La meme appli, sans algorithme » : on parle d'elles, elles sont la —
 * en fond, discretes, chacune a son rythme, comme des bulles. Tout vit sur
 * le fil d'animation.
 */
const DRIFT_APPS = ['instagram', 'tiktok', 'twitter', 'youtube', 'instagram', 'tiktok', 'twitter', 'youtube'] as const;

function Drift() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {DRIFT_APPS.map((id, i) => (
        <DriftIcon key={i} id={id} i={i} width={width} height={height} />
      ))}
    </View>
  );
}

function DriftIcon({ id, i, width, height }: { id: (typeof DRIFT_APPS)[number]; i: number; width: number; height: number }) {
  // Des places fixes, semees pour ne pas se chevaucher : bords et coins,
  // jamais le centre, ou le texte s'ecrit — et jamais le bas, ou le contenu
  // se fond dans le noir avant l'invite : une icone a cheval sur ce fondu
  // avait l'air coupee en deux.
  const spots = [[0.08, 0.12], [0.8, 0.09], [0.14, 0.36], [0.86, 0.32], [0.06, 0.58], [0.84, 0.55], [0.24, 0.7], [0.7, 0.68]];
  const [fx, fy] = spots[i % spots.length];
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(i * 300, withRepeat(withTiming(1, { duration: 3800 + i * 500, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [t, i]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.32 + t.value * 0.28,
    transform: [
      { translateY: -12 + t.value * 24 },
      { translateX: (i % 2 === 0 ? -1 : 1) * (t.value * 10 - 5) },
      { rotate: `${(i % 2 === 0 ? -1 : 1) * (6 - t.value * 12)}deg` },
      { scale: 0.9 + t.value * 0.15 },
    ],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: width * fx, top: height * fy, width: 30, height: 30, borderRadius: 8, overflow: 'hidden' }, style]}>
      <Image source={LOGOS[id]} style={{ width: 30, height: 30 }} contentFit="contain" />
    </Animated.View>
  );
}

/* ---------- Les annees qu'il reste ---------- */

const COLS = 10;
const GAP = 7;
/** Le retrait de la grille dans la page : de l'air autour des cases. */
const INSET = 12;
// Quatre couleurs qui ne se confondent pas : le libre est le SEUL vert.
const WORK_GREEN = '#A78BFA';
type Kind = 'sleep' | 'work' | 'eat' | 'free';

/** Le tempo, en millisecondes. */
const APPEAR = 9;   // une case de plus
const TAKE = 0;     // une case prise de plus (sommeil, travail, repas)
const BITE = 55;     // une case libre mordue de plus (le telephone)
const BEAT = 350;   // le silence entre deux etapes
/** Le temps de LIRE la ligne et de voir les cases colorees, avant qu'elles partent. */
const READ = 550;

/**
 * Tes annees, une case chacune — et ce qu'il en reste vraiment.
 *
 * Toutes apparaissent d'abord : c'est ce qu'il reste. Puis on enumere ce
 * qui est deja pris, et a chaque ligne les cases concernees DISPARAISSENT
 * de la grille — elles prennent leur couleur, se referment, et les autres
 * se resserrent. Quand le sommeil, le travail et les repas sont partis, il
 * ne reste que le temps libre, et on le dit. Alors le telephone vient
 * mordre dedans, en rouge, case par case, et la phrase tombe : sur ce temps
 * libre, tu en passes tant pour cent sur ton telephone. Pas d'annees ici :
 * elles sont sur l'ecran d'apres.
 *
 * Tout vit sur le fil d'animation. Une seule horloge avance, et chaque case
 * sait a quel instant elle apparait, se colore, se referme ou rougit.
 */
export function LifeYears({ onNext }: P) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const { width } = useWindowDimensions();
  const age = useOnboardingStore((x) => x.age);
  const minutes = useOnboardingStore(effectiveMinutes);
  const L = useMemo(() => lifeYears(age, minutes), [age, minutes]);
  const pct = useMemo(() => freeShare(age, minutes), [age, minutes]);
  const title = t(d.life.title, { age, n: L.remaining });

  /*
    Le plan de chaque case, calcule une fois : sa nature, l'instant ou elle
    apparait, l'instant ou elle est prise (et se referme), ou mordue.
    Le telephone mord le libre PAR LA FIN, a hauteur du pourcentage — et
    jamais tout : le temps libre reste plus grand que ce qu'il y prend.
  */
  const plan = useMemo(() => {
    const kinds: Kind[] = [];
    (['sleep', 'work', 'eat'] as const).forEach((k) => { for (let i = 0; i < L[k]; i += 1) kinds.push(k); });
    while (kinds.length < L.remaining) kinds.push('free');
    const free = kinds.filter((k) => k === 'free').length;
    const bites = Math.max(0, Math.min(free - 1, Math.round((free * pct) / 100)));

    /*
      Chaque groupe se lit en trois temps : la ligne tombe et TOUTES ses
      cases prennent leur couleur d'un coup (on voit lesquelles), un temps
      de lecture, puis elles se referment une par une. Trop vite, on ne
      comprenait pas ce qui partait.
    */
    const t0 = typeDuration(title, 32, 0) + 300;
    const tSleep = t0 + L.remaining * APPEAR + 600;
    const tWork = tSleep + READ + L.sleep * TAKE + BEAT;
    const tEat = tWork + READ + L.work * TAKE + BEAT;
    const tFree = tEat + READ + L.eat * TAKE + BEAT;
    const tPhone = tFree + 900;
    const tDone = tPhone + bites * BITE + 700;

    let freeIndex = 0;
    const cells = kinds.map((kind) => {
      let paintAt = Number.MAX_SAFE_INTEGER;
      let goneAt = Number.MAX_SAFE_INTEGER;
      let biteAt = Number.MAX_SAFE_INTEGER;
      // Les annees prises se colorent par groupe, puis S'EFFACENT ensemble
      // (en gris) quand on nomme le temps libre : il ne reste que lui en couleur.
      if (kind === 'sleep') { paintAt = tSleep; goneAt = tFree; }
      if (kind === 'work') { paintAt = tWork; goneAt = tFree; }
      if (kind === 'eat') { paintAt = tEat; goneAt = tFree; }
      if (kind === 'free') {
        // Les dernieres cases libres sont mordues, de la fin vers le debut.
        const fromEnd = free - 1 - freeIndex;
        if (fromEnd < bites) biteAt = tPhone + fromEnd * BITE;
        freeIndex += 1;
      }
      return { kind, paintAt, goneAt, biteAt };
    });
    return { cells, t0, tSleep, tWork, tEat, tFree, tPhone, tDone, bites };
  }, [L, pct, title]);

  const clock = useSharedValue(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    clock.value = 0;
    clock.value = withTiming(plan.tDone + 400, { duration: plan.tDone + 400, easing: Easing.linear });
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)); };
    later(plan.t0, () => setStage(1));
    for (let i = 0; i < L.remaining; i += 8) later(plan.t0 + i * APPEAR, () => haptics.tick());
    later(plan.tSleep, () => { setStage(2); haptics.tick(); });
    later(plan.tWork, () => { setStage(3); haptics.tick(); });
    later(plan.tEat, () => { setStage(4); haptics.tick(); });
    later(plan.tFree, () => { setStage(5); haptics.press(); });
    later(plan.tPhone, () => setStage(6));
    for (let i = 0; i < plan.bites; i += 2) later(plan.tPhone + i * BITE, () => haptics.tick());
    later(plan.tDone, () => { setStage(7); haptics.success(); });
    return () => { timers.forEach(clearTimeout); cancelAnimation(clock); };
  }, [plan, L.remaining, clock]);

  const cell = Math.floor((width - gutter * 2 - INSET * 2 - COLS * GAP) / COLS);
  const base = withAlpha(c.mist, 0.09);
  const freeTone = '#34D399';
  const tone: Record<Kind, string> = {
    sleep: '#60A5FA', work: WORK_GREEN, eat: '#FBBF24', free: freeTone,
  };

  const lines: [number, string, string][] = [
    [2, tone.sleep, t(d.life.sleep, { n: L.sleep })],
    [3, tone.work, t(d.life.work, { n: L.work })],
    [4, tone.eat, t(d.life.eat, { n: L.eat })],
    [5, freeTone, d.life.freeLine],
  ];

  return (
    <Screen
      cta={d.ob.keepGoing}
      onPress={onNext}
      center
      disabled={stage < 7}
      hue={stage >= 6 ? 'ember' : 'accent'}
      hueLevel={stage >= 6 ? 1 : Math.min(0.5, stage / 8)}
    >
      <Typewriter text={title} variant="displayM" style={s.center} />

      <View style={[s.years, { paddingHorizontal: INSET }]}>
        {plan.cells.map((p, i) => (
          <Cell
            key={i}
            size={cell}
            clock={clock}
            appearAt={plan.t0 + i * APPEAR}
            paintAt={p.paintAt}
            goneAt={p.goneAt}
            biteAt={p.biteAt}
            freeAt={p.kind === 'free' ? plan.tFree : Number.MAX_SAFE_INTEGER}
            base={base}
            free={freeTone}
            colour={tone[p.kind]}
            danger={c.danger}
          />
        ))}
      </View>

      {/* Les lignes ont une place FIXE : quatre au plus, et rien ne saute.
          Chacune tombe au moment ou ses cases se referment. */}
      <View style={s.lines}>
        {lines.map(([at, dot, label]) => (stage >= at ? (
          <Animated.View key={at} entering={FadeInDown.duration(380)} style={s.lineRow}>
            <View style={[s.lineDot, { backgroundColor: dot }]} />
            {/* Sans l'emoji du texte : la pastille de couleur dit deja de quoi il s'agit. */}
            <Text variant={at === 5 ? 'title' : 'body'} tone={at === 5 ? undefined : 'secondary'}>{label.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\uFE0F?\s*/, '')}</Text>
          </Animated.View>
        ) : null))}
      </View>

      {/* La phrase, a la fin, sur le libre — sans annees : elles sont sur
          l'ecran d'apres. */}
      <View style={s.leftSlot}>
        {stage >= 7 && (
          <Animated.View entering={FadeIn.duration(700)}>
            <Text variant="displayM" color={c.danger} style={s.center}>
              {t(d.life.share, { p: pct })}
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
 * Elle apparait en grandissant a son instant. Prise, elle prend sa couleur
 * puis SE REFERME — largeur et marge a zero — et la grille se resserre
 * autour d'elle. Libre, elle s'eclaircit quand on nomme le temps libre, et
 * rougit si le telephone la mord. Tout est calcule sur le fil d'animation.
 */
function Cell({
  size, clock, appearAt, paintAt, goneAt, biteAt, freeAt, base, free, colour, danger,
}: {
  size: number;
  clock: SharedValue<number>;
  appearAt: number;
  paintAt: number;
  goneAt: number;
  biteAt: number;
  freeAt: number;
  base: string;
  free: string;
  colour: string;
  danger: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = clock.value;
    const born = interpolate(t, [appearAt, appearAt + 260], [0, 1], Extrapolation.CLAMP);
    const paint = interpolate(t, [paintAt, paintAt + 420], [0, 1], Extrapolation.CLAMP);
    const gone = interpolate(t, [goneAt, goneAt + 520], [0, 1], Extrapolation.CLAMP);
    const lit = interpolate(t, [freeAt, freeAt + 500], [0, 1], Extrapolation.CLAMP);
    const bite = interpolate(t, [biteAt, biteAt + 220], [0, 1], Extrapolation.CLAMP);
    // Prise, la case GARDE sa place : elle se colore, puis passe au gris.
    const k = 1;
    const resting = interpolateColor(lit, [0, 1], [base, free]);
    const coloured = interpolateColor(paint, [0, 1], [resting, colour]);
    const painted = interpolateColor(gone, [0, 1], [coloured, base]);
    // La case mordue saute un peu en rougissant : on sent ce qui est pris.
    const pop = bite > 0 && bite < 1 ? 1 + 0.4 * Math.sin(bite * Math.PI) : 1;
    return {
      opacity: born,
      width: size * k,
      height: size,
      marginRight: GAP * k,
      marginBottom: GAP,
      backgroundColor: interpolateColor(bite, [0, 1], [painted, danger]),
      transform: [{ scale: (0.55 + 0.45 * born) * pop }],
    };
  });
  return <Animated.View style={[{ borderRadius: Math.max(4, size / 4) }, style]} />;
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
  const { d, t, lang } = useT();
  const age = useOnboardingStore((x) => x.age);
  const minutes = useOnboardingStore(effectiveMinutes);
  const L = useMemo(() => lifeYears(age, minutes), [age, minutes]);
  /*
    LES DEGATS, EN MINUTES.
    Les minutes a scroller d'ici la fin, a ce rythme : un chiffre qui monte
    jusqu'aux millions. Puis, encadree en rouge, ce que ca fait en annees —
    le meme calcul que la grille d'avant, pour que les deux ecrans disent
    la meme chose.
  */
  const total = Math.round(minutes * 365.25 * L.remaining);
  const [m, setM] = useState(0);
  const [boxed, setBoxed] = useState(false);
  const fmt = useMemo(() => {
    try { return new Intl.NumberFormat(lang); } catch { return null; }
  }, [lang]);

  useEffect(() => {
    const steps = 40;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      // Rapide au debut, qui ralentit sur la fin : on voit le chiffre se poser.
      const k = 1 - Math.pow(1 - i / steps, 3);
      setM(Math.round(total * k));
      if (i % 8 === 0) haptics.tick();
      if (i >= steps) { clearInterval(id); setTimeout(() => { setBoxed(true); haptics.press(); }, 250); }
    }, 1500 / steps);
    return () => clearInterval(id);
  }, [total]);

  return (
    <Screen cta={d.misc.reclaim} onPress={onNext} readyAfter={1000} center hue="ember">
      <Animated.View entering={FadeIn.duration(500)} style={s.yearsBlock}>
        <Text variant="displayM" style={s.center}>{d.s6.damage}</Text>
        <Text variant="hero" color={c.mist} style={[s.center, { marginTop: space.lg, fontVariant: ['tabular-nums'] }]} numberOfLines={1} adjustsFontSizeToFit>
          {fmt ? fmt.format(m) : String(m)}
        </Text>
        <Text variant="lead" tone="secondary" style={s.center}>{d.s6.minutesLine}</Text>
      </Animated.View>
      <View style={s.damageSlot}>
        {boxed && (
          <Animated.View entering={FadeIn.duration(450)} style={[s.damageBox, { borderColor: withAlpha(c.danger, 0.6), backgroundColor: withAlpha(c.danger, 0.12) }]}>
            <Text variant="displayM" color={c.danger} style={s.center}>{t(d.s6.equiv, { y: L.phone })}</Text>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  yearsBlock: { alignItems: 'center', gap: space.xs },
  damageSlot: { height: 96, justifyContent: 'center', marginTop: space.xl },
  damageBox: { borderWidth: 1.5, borderRadius: 18, paddingVertical: space.md, paddingHorizontal: space.lg, alignSelf: 'center' },
  mark: { width: 64, height: 64, alignSelf: 'center', marginBottom: space.xl },
  center: { textAlign: 'center' },
  years: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignSelf: 'stretch', marginTop: space.xl },
  lines: { alignSelf: 'stretch', minHeight: 4 * 32, marginTop: space.lg, gap: 6 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lineDot: { width: 12, height: 12, borderRadius: 3 },
  leftSlot: { minHeight: 80, marginTop: space.md, justifyContent: 'center' },
  // Le halo n'existe que pour ce theme sombre : c.mist sur c.night.
  legacy: { color: withAlpha(c.mist, 0.5) },
});
