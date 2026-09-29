import { useEffect, useMemo, useState } from 'react';
import { Animated as RNAnimated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowDown, ArrowUp, Cake, Equal, Minus, Plus } from 'lucide-react-native';
import { Emblem } from '../scenes/Emblem';
import { withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { track } from '@/services';
import { useT } from '@/i18n';
import { useOnboardingStore } from '@/store/onboarding';
import { compareGuess } from '../calculations';
import { VerticalGauge } from '../scenes/VerticalGauge';
import { AgeInput } from '../scenes/AgeInput';
import { ScreenTimeReportView, reportAvailable } from '@/native/screenTimeReport';
import { authorizationStatus } from '@/services/shield.real';
import { useNativeReport, useReportHeight } from '../report';
import { ReportSkeleton } from '../ReportSkeleton';

type P = { onNext: () => void };

/* ---------- L'estimation ---------- */

/**
 * « A ton avis, combien ? » — et rien d'autre sur l'ecran.
 *
 * Le sous-titre calculait en direct la part de journee eveillee que ca
 * represente. C'etait la reponse de l'ecran suivant, donnee avant qu'on ait
 * fini de repondre a celui-ci : on regardait le pourcentage bouger au lieu
 * de chercher son propre chiffre. Une question, une jauge, une phrase pour
 * dire qu'on ne juge pas.
 */
const THINKING = require('@/assets/rig/corti-pose-pense.png');

export function Guess({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const stored = useOnboardingStore((x) => x.minutesPerDay);
  const setMinutes = useOnboardingStore((x) => x.setMinutesPerDay);
  const [minutes, setDraft] = useState(stored);
  /*
    Tout doit tenir AU-DESSUS du bouton, sans defiler : la jauge se regle
    au doigt, et une page qui bouge sous le doigt est une page qu'on ne
    peut pas regler. On mesure l'ecran et on donne a la colonne ce qui
    reste une fois le titre, Corti et le bouton poses — et sur un petit
    ecran, Corti cede sa place a la jauge.
  */
  const { height: winH } = useWindowDimensions();
  const gaugeH = Math.max(150, Math.min(280, winH - 630));
  const showCorti = winH >= 720;
  /*
    La ligne sous la jauge REPOND, sans juger : en bas, elle rappelle que
    presque tout le monde sous-estime ; en haut, elle dit que c'est beaucoup
    et qu'on va s'en occuper. Elle change de phrase, jamais de place — une
    hauteur fixe, sinon la jauge bougerait sous le doigt.
  */
  const tier = minutes >= 240 ? 'high' : minutes < 90 ? 'low' : 'mid';
  const line = tier === 'high' ? d.s5.high : tier === 'low' ? d.s5.low : d.s5.noJudge;

  return (
    <Screen emblem={showCorti ? <Image source={THINKING} style={{ width: 96, height: 96 }} contentFit="contain" /> : undefined}
      cta={d.s5.ctaA}
      onPress={() => {
        setMinutes(minutes);
        track('screen_time_set', { minutes });
        onNext();
      }}
      center
      still
      hue="accent"
    >
      <Typewriter text={d.s5.titleA} variant="displayM" style={st.center} />
      <Text variant="body" tone="tertiary" style={[st.center, { marginTop: space.sm }]}>
        {d.s5.hint}
      </Text>
      <View style={st.gaugeTight}>
        <VerticalGauge minutes={minutes} onChange={setDraft} onCommit={setMinutes} height={gaugeH} />
      </View>
      <View style={st.reassure}>
        <Animated.View key={tier} entering={FadeIn.duration(320)}>
          <Text variant="body" tone="tertiary" style={st.center}>{line}</Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

/* ---------- L'analyse qui se prepare ---------- */

const SCAN_STEP = 800;

/**
 * Trois lignes qui se remplissent l'une apres l'autre, avant le bilan.
 *
 * Rien ne se calcule ici : le rapport d'Apple se dessine tout seul. Mais un
 * resultat qui tombe sans qu'on l'ait vu se preparer ne pese rien ; deux
 * secondes de « ca travaille » lui donnent son poids. On ne le joue que
 * quand il y a un bilan a preparer — sans extension ni autorisation, c'est
 * la saisie qui suit, et on ne fait pas semblant d'analyser ce qu'on va
 * demander.
 */
export function Scan({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const [show, setShow] = useState(false);
  const lines = [d.time.scan1, d.time.scan2, d.time.scan3];

  useEffect(() => {
    let alive = true;
    void (async () => {
      const ok = reportAvailable() && (await authorizationStatus()) === 'approved';
      if (!alive) return;
      if (ok) setShow(true); else onNext();
    })();
    return () => { alive = false; };
  }, [onNext]);

  useEffect(() => {
    if (!show) return;
    const ticks = [0, 1, 2].map((i) => setTimeout(() => haptics.tick(), SCAN_STEP * i + 200));
    const end = setTimeout(onNext, SCAN_STEP * 3 + 500);
    return () => { ticks.forEach(clearTimeout); clearTimeout(end); };
  }, [show, onNext]);

  return (
    <Screen center still hue="accent">
      {show && lines.map((l, i) => <ScanLine key={l} label={l} delay={SCAN_STEP * i} accent={c.accent} />)}
      {/* Une vue d'un point, invisible : elle lance le processus de
          l'extension maintenant, pour que le vrai dessin, sur l'ecran
          suivant, n'ait plus qu'a s'afficher. */}
      {show && ScreenTimeReportView && (
        <ScreenTimeReportView context="compare" days={7} style={st.warm} />
      )}
    </Screen>
  );
}

function ScanLine({ label, delay, accent }: { label: string; delay: number; accent: string }) {
  const st = useMemo(() => sheet(), []);
  const c = useColors();
  // L'API Animated de React Native, sur le fil natif : une echelle, pas une
  // largeur, pour que la barre avance sans repasser par la mise en page.
  const [fill] = useState(() => new RNAnimated.Value(0));
  useEffect(() => {
    RNAnimated.timing(fill, {
      toValue: 1, duration: SCAN_STEP - 120, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [delay, fill]);

  return (
    <Animated.View entering={FadeIn.delay(delay).duration(300)} style={st.scanRow}>
      <Text variant="body" tone="secondary">{label}</Text>
      <View style={[st.scanTrack, { backgroundColor: withAlpha(c.mist, 0.12) }]}>
        <RNAnimated.View style={[st.scanFill, { backgroundColor: accent, transform: [{ scaleX: fill }] }]} />
      </View>
    </Animated.View>
  );
}

/* ---------- Le vrai chiffre ---------- */

const PICK_MIN = 0, PICK_MAX = 300, PICK_STEP = 5;

/**
 * Le vrai temps, recopie depuis Reglages.
 *
 * Apple ne le donne a AUCUNE app : le rapport de Temps d'ecran vit dans une
 * extension isolee et ses nombres ne traversent jamais vers l'app hote. Les
 * apps qui semblent le lire demandent en realite de le recopier — c'est ce
 * qu'on fait ici, en le disant. Trois etapes pour le trouver, la meme jauge
 * que pour l'estimation pour le poser, et les prises en main a cote, qui
 * sont sur la meme page de Reglages.
 */
export function RealTime({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const guess = useOnboardingStore((x) => x.minutesPerDay);
  const storedReal = useOnboardingStore((x) => x.realMinutes);
  const storedPick = useOnboardingStore((x) => x.pickups);
  const setReal = useOnboardingStore((x) => x.setReal);
  // On part de l'estimation : la jauge ne peut pas partir de zero sans
  // laisser croire que le vrai chiffre est zero.
  const [minutes, setMinutes] = useState(storedReal ?? guess);
  const [pickups, setPickups] = useState(storedPick ?? 40);

  const bump = (delta: number) => {
    setPickups((n) => Math.min(PICK_MAX, Math.max(PICK_MIN, n + delta)));
    haptics.tick();
  };

  return (
    <Screen
      cta={d.time.realCta}
      onPress={() => { setReal(minutes, pickups); track('screen_time_set', { minutes, real: true }); onNext(); }}
      hue="warm"
    >
      <Text variant="displayM">{d.time.realTitle}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.sm }}>{d.time.realBody}</Text>

      <View style={st.path}>
        {[d.time.step1, d.time.step2, d.time.step3].map((s, i) => (
          <View key={s} style={st.pathRow}>
            <View style={[st.badge, { backgroundColor: c.accent }]}>
              <Text variant="label" color={c.night}>{i + 1}</Text>
            </View>
            <Text variant="body" style={{ flex: 1 }}>{s}</Text>
          </View>
        ))}
      </View>

      <View style={[st.gauge, { marginTop: space.lg }]}>
        <VerticalGauge minutes={minutes} onChange={setMinutes} />
      </View>

      <View style={st.stepper}>
        <Pressable onPress={() => bump(-PICK_STEP)} hitSlop={10} style={st.stepBtn} accessibilityRole="button">
          <Minus size={18} strokeWidth={2.4} color={c.mist} />
        </Pressable>
        <View style={{ alignItems: 'center', minWidth: 120 }}>
          <Text variant="title">{pickups}</Text>
          <Text variant="label" tone="tertiary">{d.time.pickups}</Text>
        </View>
        <Pressable onPress={() => bump(PICK_STEP)} hitSlop={10} style={st.stepBtn} accessibilityRole="button">
          <Plus size={18} strokeWidth={2.4} color={c.mist} />
        </Pressable>
      </View>
    </Screen>
  );
}

/* ---------- La comparaison ---------- */

const BAR_H = 150;
/** Le temps qu'on laisse au squelette avant de s'effacer : l'extension a
 *  presque toujours dessine avant, et on ne l'attend pas plus longtemps. */
const SKELETON_MS = 1400;

/** Vrai pendant la premiere seconde et demie d'un ecran natif. */
function useSkeleton(active: boolean): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setOn(false), SKELETON_MS);
    return () => clearTimeout(id);
  }, [active]);
  return active && on;
}

/**
 * Ce qu'on croyait, a cote de ce qui est.
 *
 * Deux colonnes, la meme echelle, et un verdict qui S'ADAPTE : « moins que
 * tu ne pensais » est une bonne nouvelle a dire comme telle, « plus » n'est
 * pas une faute — presque tout le monde sous-estime — et sous dix pour cent
 * on ne tranche pas du tout. L'ecart est en pourcentage de l'estimation,
 * parce que « 30 % de plus » se comprend et « 45 minutes de plus » demande
 * de refaire le calcul.
 */
export function Compare({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d, t } = useT();
  const guess = useOnboardingStore((x) => x.minutesPerDay);
  const storedReal = useOnboardingStore((x) => x.realMinutes);
  const real = storedReal ?? guess;
  const { pct, verdict } = compareGuess(guess, real);
  const native = useNativeReport(guess);
  const reportH = useReportHeight(360, 500);
  const skeleton = useSkeleton(native === 'yes');
  // Le chiffre a-t-il ete recopie ? Sinon, et sans extension, on le demande
  // d'abord — ici meme, pas sur un ecran de plus.
  const [entered, setEntered] = useState(storedReal !== undefined);

  if (native === 'unknown') return <Screen center hue="accent"><View /></Screen>;

  /*
    Le chemin d'Apple : ce qui depend du vrai chiffre — le verdict, le
    nombre, l'ecart, les barres — est DESSINE par l'extension, avec un
    chiffre que nous ne verrons jamais. Le titre, lui, est a l'app : il ne
    depend de rien, et un ecran qui commence par un dessin qu'on attend se
    lit comme une panne.
  */
  if (native === 'yes' && ScreenTimeReportView) {
    return (
      <Screen cta={d.ob.keepGoing} onPress={onNext} center still hue="accent">
        <Typewriter text={d.time.cmpTitle} variant="displayM" style={st.center} />
        <Text variant="body" tone="tertiary" style={[st.center, { marginTop: space.sm }]}>{d.time.cmpSub}</Text>
        <View style={[st.report, { height: reportH }]}>
          {skeleton && <ReportSkeleton rows={3} />}
          <ScreenTimeReportView context="compare" days={7} style={StyleSheet.absoluteFill} />
        </View>
      </Screen>
    );
  }

  if (!entered) return <RealTime onNext={() => setEntered(true)} />;

  const tone = verdict === 'less' ? '#2E9E5B' : verdict === 'more' ? c.danger : c.accent;
  const Icon = verdict === 'less' ? ArrowDown : verdict === 'more' ? ArrowUp : Equal;
  const title = verdict === 'less' ? d.time.lessTitle : verdict === 'more' ? d.time.moreTitle : d.time.sameTitle;
  const sub = verdict === 'less' ? d.time.lessSub : verdict === 'more' ? d.time.moreSub : d.time.sameSub;
  const delta = verdict === 'less' ? d.time.deltaLess : verdict === 'more' ? d.time.deltaMore : d.time.deltaSame;
  const top = Math.max(guess, real, 1);

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} center hue={verdict === 'more' ? 'ember' : 'accent'}>
      <Text variant="displayM" style={st.center}>{title}</Text>
      <Text variant="body" tone="secondary" style={[st.center, { marginTop: space.sm }]}>{sub}</Text>

      <Animated.View entering={FadeIn.delay(300).duration(520)} style={st.verdict}>
        <View style={[st.ring, { backgroundColor: tone }]}>
          <Icon size={22} strokeWidth={2.6} color="#FFFFFF" />
        </View>
        <Text variant="hero" style={st.center} numberOfLines={1} adjustsFontSizeToFit>
          {formatHours(real)}
        </Text>
        <Text variant="body" tone="secondary" style={st.center}>{t(delta, { p: pct })}</Text>
      </Animated.View>

      <View style={st.bars}>
        <Bar h={(guess / top) * BAR_H} colour={withAlpha(c.mist, 0.28)} rim={withAlpha(c.mist, 0.6)} value={formatHours(guess)} label={d.time.guessLabel} delay={500} />
        <Bar h={(real / top) * BAR_H} colour={withAlpha(tone, 0.32)} rim={tone} value={formatHours(real)} label={d.time.realLabel} delay={700} valueColour={tone} />
      </View>
    </Screen>
  );
}

function Bar({
  h, colour, rim, value, label, delay, valueColour,
}: { h: number; colour: string; rim: string; value: string; label: string; delay: number; valueColour?: string }) {
  const st = useMemo(() => sheet(), []);
  return (
    <View style={st.col}>
      <View style={{ height: BAR_H, justifyContent: 'flex-end' }}>
        <Animated.View
          entering={FadeIn.delay(delay).duration(420)}
          style={[st.bar, { height: Math.max(6, h), backgroundColor: colour, borderTopColor: rim }]}
        />
      </View>
      <Text variant="button" color={valueColour}>{value}</Text>
      <Text variant="label" tone="tertiary">{label}</Text>
    </View>
  );
}

/* ---------- L'analyse ---------- */

/**
 * Ce que le vrai chiffre contient.
 *
 * Avec l'extension : la moyenne, ce qu'elle fait a l'annee, sept vraies
 * journees, les prises en main et les apps les plus gourmandes — dessines
 * par Apple, sous un titre qui est a nous. Sans elle : ce qu'on tient, la
 * moyenne recopiee et ce qu'elle fait a l'annee ; dessiner sept barres a
 * partir d'une moyenne serait inventer six chiffres.
 *
 * Il y avait ici, sous le rapport, une liste d'apps a cocher « tes plus
 * grandes distractions ». Elle ne servait a rien dans l'app — et posee
 * sous les apps les plus gourmandes qu'Apple venait de nommer, elle
 * demandait ce qu'on venait de lire. Retiree.
 */
export function Analysis({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d, t } = useT();
  const guess = useOnboardingStore((x) => x.minutesPerDay);
  const real = useOnboardingStore((x) => x.realMinutes) ?? guess;
  const pickups = useOnboardingStore((x) => x.pickups) ?? 0;
  const native = useNativeReport(guess);
  const skeleton = useSkeleton(native === 'yes');

  if (native === 'unknown') return <Screen center hue="ember"><View /></Screen>;

  if (native === 'yes' && ScreenTimeReportView) {
    return (
      <Screen cta={d.ob.keepGoing} onPress={onNext} hue="ember">
        <Text variant="displayM" style={st.center}>{d.time.analysisTitle}</Text>
        <Text variant="body" tone="tertiary" style={[st.center, { marginTop: space.sm }]}>{d.time.analysisSub}</Text>
        <View style={[st.report, { height: 540 }]}>
          {skeleton && <ReportSkeleton rows={4} />}
          <ScreenTimeReportView context="overview" days={7} style={StyleSheet.absoluteFill} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} center hue="ember">
      <Text variant="displayM" style={st.center}>{d.time.analysisTitle}</Text>
      <Text variant="hero" color={c.danger} style={[st.center, { marginTop: space.md }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatHours(real)}
      </Text>
      <Text variant="body" tone="secondary" style={st.center}>{d.time.analysisSub}</Text>
      <Text variant="label" color={c.ember} style={[st.center, { marginTop: space.xs }]}>
        {t(d.time.perYear, { h: formatHours(real * 365) })}
      </Text>

      {pickups > 0 && (
        <View style={[st.card, { borderColor: withAlpha(c.mist, 0.12) }]}>
          <Text variant="label" tone="tertiary">{d.time.pickupsTitle.toUpperCase()}</Text>
          <Text variant="title" style={{ marginTop: 2 }}>
            {t(d.time.pickupsBody, { n: pickups, y: (pickups * 365).toLocaleString() })}
          </Text>
        </View>
      )}
    </Screen>
  );
}

/* ---------- L'age ---------- */

export function AgeAsk({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const age = useOnboardingStore((x) => x.age);
  const setAge = useOnboardingStore((x) => x.setAge);
  // Les cases partent vides : tant qu'elles le sont, on ne peut pas avancer.
  const [ok, setOk] = useState(false);

  return (
    <Screen emblem={<Emblem icon={Cake} />}
      cta={d.s5.ctaB}
      onPress={() => { track('age_set', { age }); onNext(); }}
      disabled={!ok}
      center
      hue="warm"
    >
      <Typewriter text={d.s5.titleB} variant="displayM" style={st.center} />
      <View style={st.age}>
        <AgeInput age={age} onChange={setAge} onReady={setOk} />
      </View>
    </Screen>
  );
}

const sheet = () => StyleSheet.create({
  center: { textAlign: 'center' },
  gauge: { alignItems: 'center', marginVertical: space.xl },
  gaugeTight: { alignItems: 'center', marginVertical: space.lg },
  reassure: { height: 48, justifyContent: 'center' },
  scanRow: { alignSelf: 'stretch', gap: space.sm, marginBottom: space.lg },
  scanTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  scanFill: { height: 6, borderRadius: 3, transformOrigin: 'left' },
  path: { marginTop: space.lg, gap: space.sm },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.lg, marginTop: space.md,
  },
  stepBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha('#FAFAFA', 0.1),
  },
  verdict: { alignItems: 'center', gap: space.sm, marginTop: space.xl },
  ring: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { alignSelf: 'stretch', borderRadius: 6, borderTopWidth: 3 },
  card: {
    marginTop: space.lg, padding: space.md, borderRadius: 18, borderWidth: 1,
    backgroundColor: withAlpha('#FAFAFA', 0.05),
  },
  report: { alignSelf: 'stretch', marginTop: space.lg },
  warm: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  age: { marginTop: space.xxl, alignItems: 'center' },
});
