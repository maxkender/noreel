import { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { SelectCard } from '@/components/SelectCard';
import { Text } from '@/components/type/Text';
import { Receptors } from '../scenes/Receptors';
import { Typewriter, typeDuration } from '@/components/type/Typewriter';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useOnboardingStore, type PainFrequency } from '@/store/onboarding';
import { formatHours } from '@/lib/format';
import { track } from '@/services';
import { WAKING_HOURS, screenYears, wakingShare } from '../calculations';


import { TimeSlider } from '../scenes/TimeSlider';
import { AgeInput } from '../scenes/AgeInput';

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
const WORK = Math.round((8 / WAKING_HOURS) * 100);

/*
 * Le vert du travail ne vient pas de la palette : elle n'en a pas, et il n'y
 * a aucune raison d'en ajouter un pour un seul ecran. Il tient sur les deux
 * fonds, c'est tout ce qu'on lui demande.
 */
const WORK_GREEN = '#2E9E5B';

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

/* ---------- 3 ---------- */
export function S3({ onNext }: P) {
  const { d } = useT();
  const setPain = useOnboardingStore((x) => x.setPainFrequency);
  const [a, setA] = useState<PainFrequency | null>(null);

  const opts: [PainFrequency, string, string][] = [
    ['daily', '🌙', d.s3.daily],
    ['weekly', '🔁', d.s3.weekly],
    ['lostCount', '🫠', d.s3.lostCount],
  ];

  return (
    <Screen cta={d.s3.cta} onPress={onNext} disabled={!a} hue="warm">
      <Typewriter text={d.s3.title} variant="displayM" />
      {true && (
        <Animated.View entering={FadeIn.duration(500)} style={{ marginTop: space.xxl, gap: space.md }}>
          {opts.map(([k, icon, label]) => (
            <SelectCard
              key={k}
              label={label}
              lead={<Text variant="title">{icon}</Text>}
              selected={a === k}
              onPress={() => { setA(k); setPain(k); track('pain_answered', { answer: k }); }}
            />
          ))}
        </Animated.View>
      )}
    </Screen>
  );
}

/* ---------- 5 ---------- */
export function S5({ onNext }: P) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const [phase, setPhase] = useState<'time' | 'age'>('time');
  const stored = useOnboardingStore((x) => x.minutesPerDay);
  const setMinutes = useOnboardingStore((x) => x.setMinutesPerDay);
  // Pendant le geste, la valeur vit ici. Elle ne touche le disque qu'au
  // relacher — sinon chaque pas du curseur y recopiait tout le magasin.
  const [minutes, setDraft] = useState(stored);
  const age = useOnboardingStore((x) => x.age);
  const setAge = useOnboardingStore((x) => x.setAge);
  // Les cases partent vides : tant qu'elles le sont, on ne peut pas avancer.
  const [ageOk, setAgeOk] = useState(false);

  if (phase === 'time') {
    return (
      <Screen
        cta={d.s5.ctaA}
        onPress={() => {
          // On pose la valeur avant de partir : si le doigt quitte l'ecran
          // sans relacher le curseur, rien ne l'aurait enregistree.
          setMinutes(minutes);
          track('screen_time_set', { minutes });
          setPhase('age');
        }}
        center
        hue="accent"
      >
        <Typewriter text={d.s5.titleA} variant="displayM" style={s.center} />
        <Text variant="hero" style={[s.center, s.value]} numberOfLines={1} adjustsFontSizeToFit>
          {formatHours(minutes)}
        </Text>
        <View style={s.sliderWrap}>
          <TimeSlider minutes={minutes} onChange={setDraft} onCommit={setMinutes} />
        </View>
        <Text variant="body" tone="secondary" style={s.center}>
          {t(d.s5.liveShare, { p: Math.round(wakingShare(minutes) * 100) })}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen
      cta={d.s5.ctaB}
      onPress={() => { track('age_set', { age }); onNext(); }}
      disabled={!ageOk}
      center
      hue="warm"
    >
      <Typewriter text={d.s5.titleB} variant="displayM" style={s.center} />
      <View style={s.ageWrap}>
        <AgeInput age={age} onChange={setAge} onReady={setAgeOk} />
      </View>
    </Screen>
  );
}

/* ---------- 6 ---------- */
export function S6({ onNext }: P) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const screen = Math.round(wakingShare(minutes) * 100);
  const [lit, setLit] = useState(0);

  /*
    L'ecran ne peut pas occuper plus que ce que le travail laisse.

    A onze heures d'ecran par jour, la part calculee depasse la place libre :
    la legende aurait annonce 73 % pendant que la grille n'en montrait que 50,
    puisque les cases du travail sont posees les premieres. On plafonne donc
    ce qu'on montre, et quand ca deborde on le DIT — parce que ca veut dire
    quelque chose : l'ecran a commence a manger les heures de travail.
  */
  const room = 100 - WORK;
  const shown = Math.min(screen, room);
  const over = screen > room;
  const free = room - shown;
  const freeHours = (free / 100) * WAKING_HOURS;
  const done = lit >= shown;

  // La grille attend que le titre soit ecrit : les deux en meme temps, on
  // ne lisait ni l'un ni l'autre.
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setGo(true), typeDuration(d.s6.title, 32, 0) + 300);
    return () => clearTimeout(id);
  }, [d.s6.title]);

  // 88 ms par case : assez lent qu'on voie la part grandir et que ca pese.
  useEffect(() => {
    if (!go) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setLit(i);
      if (i % 10 === 0) haptics.tick();
      if (i >= shown) clearInterval(id);
    }, 88);
    return () => clearInterval(id);
  }, [shown, go]);



  return (
    <Screen
      cta={d.s6.cta2}
      onPress={onNext}
      center
      disabled={!done}
      hue="ember"
      hueLevel={Math.min(1, lit / Math.max(1, shown))}
    >
      <Typewriter text={d.s6.title} variant="displayM" style={s.center} />

      <View style={s.hundredWrap}>
        <View style={s.hundred}>
          {Array.from({ length: 100 }, (_, i) => (
            <Cell
              key={i}
              // Le travail occupe le bas de la grille et ne bouge jamais :
              // c'est le decor, pas le propos. L'ecran vient se poser DESSUS,
              // case par case, et ce qui reste se voit retrecir en direct.
              kind={i >= 100 - WORK ? 'work' : i < lit ? 'screen' : 'free'}
            />
          ))}
        </View>
      </View>

      <View style={s.legend}>
        <Key colour={c.danger} label={t(d.misc.screenKey, { n: lit })} />
        <Key colour={WORK_GREEN} label={t(d.misc.workKey, { n: WORK })} />
        <Key colour={withAlpha(c.mist, 0.14)} label={d.misc.freeKey} />
      </View>

      {/*
        Le chiffre qui pese n'est pas la part d'ecran : c'est ce qui reste.
        Vingt-trois pour cent sur un ecran, ca ne veut rien dire. « Il te reste
        deux heures a toi dans la journee », si.
      */}
      <Text
        variant="hero"
        color={free <= 10 ? c.danger : c.ember}
        style={[s.center, s.pct]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatHours(Math.round(freeHours * 60))}
      </Text>
      <Text variant="lead" tone="secondary" style={s.center}>
        {!done ? '…'
          : over ? d.misc.overflow
          : d.misc.freePerDay}
      </Text>

    </Screen>
  );
}

/** Une entree de legende : une pastille, un mot. */
function Key({ colour, label }: { colour: string; label: string }) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  return (
    <View style={s.key}>
      <View style={[s.keyDot, { backgroundColor: colour }]} />
      <Text variant="label" tone="tertiary">{label}</Text>
    </View>
  );
}

/**
 * Une case de la grille : une heure et demie de journee eveillee, a peu pres.
 *
 * Le travail est pose d'emblee, l'ecran s'allume en fondu par-dessus. C'est
 * ce fondu qui fait le poids de l'ecran : une grille deja remplie se lit
 * comme un camembert, une grille qui se remplit sous les yeux se subit.
 */
function Cell({ kind }: { kind: 'work' | 'screen' | 'free' }) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);

  if (kind === 'work') {
    return <View style={[s.square, { backgroundColor: WORK_GREEN }]} />;
  }
  if (kind === 'screen') {
    return (
      <Animated.View
        entering={FadeIn.duration(420)}
        style={[s.square, { backgroundColor: c.danger }]}
      />
    );
  }
  return <View style={[s.square, s.squareOff]} />;
}

/**
 * Le verdict a son propre ecran : pose sous la grille, le nombre d'annees
 * se lisait comme une legende. Seul, il se prend en pleine figure.
 *
 * Les deux chiffres montent au lieu de s'afficher : on les regarde grimper,
 * et c'est ce trajet qui fait mal, pas la valeur finale.
 */
export function S6Years({ onNext }: P) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const years = Math.round(screenYears(minutes));

  const [y, setY] = useState(0);

  useEffect(() => {
    // 1,6 s quel que soit le chiffre : un petit nombre ne doit pas defiler
    // plus vite qu'un grand.
    const steps = 34;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setY(Math.round((years * i) / steps));
      if (i % 8 === 0) haptics.tick();
      if (i >= steps) clearInterval(id);
    }, 1600 / steps);
    return () => clearInterval(id);
  }, [years]);

  return (
    <Screen cta={d.misc.reclaim} onPress={onNext} center hue="ember">
      <Animated.View entering={FadeIn.duration(700)} style={s.years}>
        <Text variant="label" tone="tertiary">SUR UNE VIE DE 80 ANS</Text>
        <Text
          variant="hero"
          color={c.danger}
          style={s.center}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {t(d.s6.years, { y })}
        </Text>
        <Text variant="lead" tone="secondary" style={s.center}>
          {d.s6.bodyShort}
        </Text>
      </Animated.View>
    </Screen>
  );
}

/* ---------- 7 ---------- */
export function S7({ onNext }: P) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const [i, setI] = useState(0);

  // Trois symptomes, un fait qui frappe, une sortie. Pas d'ecran d'accroche
  // et pas de rappel des etapes passees : la ligne de temps du haut suffit.
  const steps: [string, string?, string?][] = [
    [d.brain.step1, d.brain.step1b],
    [d.brain.step2, d.brain.step2b],
    [d.brain.step3, d.brain.step3b],
    [d.brain.love, d.brain.loveSub, d.brain.loveCite],
    // Le dernier temps pose la question a laquelle tout le reste du parcours
    // sert de reponse : on ne conclut pas sur une affirmation, on demande.
    [d.brain.fix, d.brain.ready],
  ];
  const last = i >= steps.length - 1;
  const harm = last ? 0 : (i + 1) / steps.length;

  return (
    <Screen
      cta={d.tapHint}
      onPress={() => (last ? onNext() : setI((n) => n + 1))}
      tapToContinue
      hintDelay={2400}
      center
      hue="ember"
      hueLevel={harm}
    >

      <Animated.View key={i} entering={FadeIn.duration(500)}>
        <Typewriter
          text={steps[i][0]}
          variant={last ? 'displayM' : 'displayL'}
          speed={42}
          style={s.center}
        />
        {steps[i][1] ? (
          <Animated.View entering={FadeIn.delay(900).duration(500)}>
            <Text variant="lead" tone="secondary" style={[s.center, { marginTop: space.lg }]}>
              {steps[i][1]}
            </Text>
          </Animated.View>
        ) : null}
        {i === 1 ? <Receptors /> : null}
        {steps[i][2] ? (
          <Animated.View entering={FadeIn.delay(1500).duration(500)}>
            <Text variant="label" tone="tertiary" style={[s.center, { marginTop: space.lg }]}>
              {steps[i][2]}
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  videoSlot: {
    marginTop: space.xxl, height: 300, borderRadius: 26, padding: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
    backgroundColor: c.surface,
  },
  videoInner: { flex: 1, borderRadius: 20, backgroundColor: c.surfaceHi },
  hundredWrap: { alignItems: 'center', marginVertical: space.xl },
  hundred: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 5,
    width: 250,
  },
  square: { width: 20.5, height: 20.5, borderRadius: 4 },
  pct: { marginTop: 0, marginBottom: space.sm },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: space.lg, marginBottom: space.lg },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyDot: { width: 9, height: 9, borderRadius: 3 },
  years: { alignItems: 'center', gap: space.xs },
  squareOff: { backgroundColor: withAlpha(c.mist, 0.07) },
  chain: { flexDirection: 'row', gap: space.md },
  chainCol: { alignItems: 'center', width: 12 },
  chainDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent, marginTop: 6 },
  chainLine: { flex: 1, width: 1, backgroundColor: withAlpha(c.accent, 0.3) },
  center: { textAlign: 'center' },
  mark: { alignSelf: 'center', width: 96, height: 96, marginBottom: space.xl },
  value: { marginVertical: space.lg, alignSelf: 'stretch', textAlign: 'center' },
  sliderWrap: { alignItems: 'center', marginBottom: space.lg },
  ageWrap: { marginTop: space.xxl, alignItems: 'center' },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  compare: { flexDirection: 'row', gap: space.md, marginTop: space.xxl },
  col: { flex: 1, gap: space.sm },
  colBarCold: { height: 18, borderRadius: 4, backgroundColor: withAlpha(c.mist, 0.08) },
  colBarWarm: { height: 18, borderRadius: 4, backgroundColor: withAlpha(c.accent, 0.35) },
  activity: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line,
  },
  apps: { flexDirection: 'row', gap: space.xl, justifyContent: 'center', marginTop: space.xxl },
  app: { alignItems: 'center', gap: space.sm },
  appIcon: {
    width: 62, height: 62, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  appRing: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: c.mist },
});
