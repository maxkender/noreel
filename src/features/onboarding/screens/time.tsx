import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowDown, ArrowUp, Equal, Minus, Plus } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { SelectCard } from '@/components/SelectCard';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { track } from '@/services';
import { useT } from '@/i18n';
import { useOnboardingStore } from '@/store/onboarding';
import { LOGOS } from '@/features/home/AppSlider';
import { compareGuess } from '../calculations';
import { VerticalGauge } from '../scenes/VerticalGauge';
import { AgeInput } from '../scenes/AgeInput';
import { PICKABLE } from './setup';

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
export function Guess({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const stored = useOnboardingStore((x) => x.minutesPerDay);
  const setMinutes = useOnboardingStore((x) => x.setMinutesPerDay);
  const [minutes, setDraft] = useState(stored);

  return (
    <Screen
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
      <View style={st.gauge}>
        <VerticalGauge minutes={minutes} onChange={setDraft} onCommit={setMinutes} />
      </View>
      <Text variant="body" tone="tertiary" style={st.center}>{d.s5.noJudge}</Text>
    </Screen>
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
  const real = useOnboardingStore((x) => x.realMinutes) ?? guess;
  const { pct, verdict } = compareGuess(guess, real);

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
 * Pas de graphe sur sept jours : on n'a pas sept valeurs, on en a UNE — la
 * moyenne que la personne a recopiee — et dessiner sept barres a partir
 * d'une moyenne serait inventer six chiffres. On montre ce qu'on tient :
 * la moyenne, ce qu'elle fait a l'annee, les prises en main, et les apps
 * qui prennent le plus — choisies ici, puisque c'est ici qu'on regarde son
 * telephone en face.
 */
export function Analysis({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d, t } = useT();
  const guess = useOnboardingStore((x) => x.minutesPerDay);
  const real = useOnboardingStore((x) => x.realMinutes) ?? guess;
  const pickups = useOnboardingStore((x) => x.pickups) ?? 0;
  const picked = useOnboardingStore((x) => x.distractions);
  const toggle = useOnboardingStore((x) => x.toggleDistraction);

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} disabled={picked.length === 0} hue="ember">
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

      <Text variant="button" style={{ marginTop: space.xl }}>{d.time.appsTitle}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>{d.time.appsBody}</Text>
      <View style={st.list}>
        {PICKABLE.map((a) => (
          <SelectCard
            key={a.id}
            shape="check"
            label={a.name}
            lead={<Image source={LOGOS[a.id]} style={st.logo} contentFit="contain" />}
            selected={picked.includes(a.id)}
            onPress={() => toggle(a.id)}
          />
        ))}
      </View>
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
    <Screen
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
  list: { gap: space.sm, marginTop: space.md },
  logo: { width: 26, height: 26 },
  age: { marginTop: space.xxl, alignItems: 'center' },
});
