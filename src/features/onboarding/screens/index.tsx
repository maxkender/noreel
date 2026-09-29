import { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter, typeDuration } from '@/components/type/Typewriter';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { ScreenTimeReportView } from '@/native/screenTimeReport';
import { useNativeReport } from '../report';
import { LIFE_YEARS, WAKING_HOURS, wakingShare, yearsOnScreen } from '../calculations';


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


/* ---------- 6 ---------- */
export function S6({ onNext }: P) {
  const c = useColors();
  const s = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  // Le vrai temps quand il a ete saisi, l'estimation sinon : un seul endroit
  // en decide, pour que deux ecrans ne montrent jamais deux chiffres.
  const minutes = useOnboardingStore(effectiveMinutes);
  const screen = Math.round(wakingShare(minutes) * 100);
  const [lit, setLit] = useState(0);
  // Avec l'extension, c'est le VRAI chiffre qui remplit la grille — et il
  // ne traverse jamais vers l'app : Apple dessine la grille lui-meme.
  const native = useNativeReport(useOnboardingStore((x) => x.minutesPerDay));
  const [nativeDone, setNativeDone] = useState(false);

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
  const done = lit >= shown;

  // La grille attend que le titre soit ecrit : les deux en meme temps, on
  // ne lisait ni l'un ni l'autre.
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setGo(true), typeDuration(d.s6.title, 32, 0) + 300);
    return () => clearTimeout(id);
  }, [d.s6.title]);

  // Apple ne dit pas quand sa grille a fini de s'allumer : on compte le
  // temps qu'elle prend au plus, et un peu de marge pour que la vue arrive.
  useEffect(() => {
    if (native !== 'yes' || !go) return;
    const id = setTimeout(() => setNativeDone(true), 88 * (100 - WORK) + 900);
    return () => clearTimeout(id);
  }, [native, go]);

  // 88 ms par case : assez lent qu'on voie la part grandir et que ca pese.
  useEffect(() => {
    if (!go || native === 'yes') return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setLit(i);
      if (i % 10 === 0) haptics.tick();
      if (i >= shown) clearInterval(id);
    }, 88);
    return () => clearInterval(id);
  }, [shown, go, native]);

  if (native === 'unknown') return <Screen center hue="ember"><View /></Screen>;

  if (native === 'yes' && ScreenTimeReportView) {
    return (
      <Screen cta={d.s6.cta2} onPress={onNext} center disabled={!nativeDone} hue="ember" hueLevel={nativeDone ? 1 : 0.35}>
        <Typewriter text={d.s6.title} variant="displayM" style={s.center} />
        {/* La place est reservee avant que la vue arrive : elle attend la fin
            du titre, comme la grille, et rien ne doit sauter a son arrivee. */}
        <View style={s.reportSlot}>
          {go && <ScreenTimeReportView context="share" days={7} style={{ height: 430 }} />}
        </View>
      </Screen>
    );
  }

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
        La part PARTIE, pas le temps qui reste.

        L'ecran concluait sur les heures encore libres — un chiffre qu'on lit
        comme une bonne nouvelle, alors que la grille vient de montrer le
        contraire. Ce qui pese, c'est ce que l'ecran a pris : « 31 % de ta
        journee, partis » se recoit comme la grille se regarde.
      */}
      <Text
        variant="hero"
        color={c.danger}
        style={[s.center, s.pct]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {done ? `${screen}${'\u202f'}%` : '…'}
      </Text>
      <Text variant="lead" tone="secondary" style={s.center}>
        {!done ? '…' : over ? d.misc.overflow : d.s6.gone}
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
  const minutes = useOnboardingStore(effectiveMinutes);
  const age = useOnboardingStore((x) => x.age);
  const left = Math.max(1, LIFE_YEARS - age);
  const years = Math.round(yearsOnScreen(minutes, left));
  const native = useNativeReport(useOnboardingStore((x) => x.minutesPerDay));

  const [y, setY] = useState(0);

  useEffect(() => {
    if (native === 'yes') return;
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
  }, [years, native]);

  if (native === 'unknown') return <Screen center hue="ember"><View /></Screen>;

  // Le vrai chiffre, sur les annees qu'il reste : dessine par Apple, avec
  // l'age qu'on lui a passe.
  if (native === 'yes' && ScreenTimeReportView) {
    return (
      <Screen cta={d.misc.reclaim} onPress={onNext} center hue="ember">
        <ScreenTimeReportView context="years" days={7} style={{ height: 210 }} />
      </Screen>
    );
  }

  return (
    <Screen cta={d.misc.reclaim} onPress={onNext} center hue="ember">
      <Animated.View entering={FadeIn.duration(700)} style={s.years}>
        <Text variant="label" tone="tertiary">{t(d.s6.lifeOf, { n: left })}</Text>
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
        {/* La base du calcul, dite : un chiffre qui fait mal doit pouvoir
            etre verifie, sinon on le rejette avec la douleur. */}
        <Text variant="label" tone="tertiary" style={[s.center, { marginTop: space.md }]}>
          {d.s6.basis}
        </Text>
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
  reportSlot: { height: 430, marginTop: space.xl },
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
  brainFace: { alignItems: 'center', marginBottom: space.lg },
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
