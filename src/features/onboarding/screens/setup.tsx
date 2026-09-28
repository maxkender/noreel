import { useMemo, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import Animated, { FadeIn } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { SelectCard } from '@/components/SelectCard';
import { Typewriter, typeDuration } from '@/components/type/Typewriter';
import { useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { dict, useT } from '@/i18n';
import { screenYears } from '../calculations';
import { SystemAlert } from '../scenes/SystemAlert';
import { LOGOS } from '@/features/home/AppSlider';
import { Corti } from '@/components/Corti';

type P = { onNext: () => void };

/* ---------- Le constat ---------- */

/*
 * Une question, des reponses, et rien d'autre.
 *
 * Chaque reponse portait sa replique, affichee en orange des qu'on la
 * choisissait — « Aucun. Tu en as pourtant vu des centaines. » On repondait
 * donc a la personne pour lui dire qu'elle avait tort, sur un ecran dont tout
 * l'interet est qu'elle fasse le constat elle-meme. La question suffit.
 */
type Step =
  | {
      kind: 'ask';
      q: string;
      /** Ajoute « Honnêtement… » sous la question : ça change les réponses. */
      honest?: boolean;
      options: string[];
    }
  | { kind: 'say'; q: string; sub?: string };

const CONSTAT: Step[] = [
  {
    kind: 'ask',
    q: 'Tu te souviens de combien de Reels vus cette {semaine} ?',
    honest: true,
    options: ['Aucun', 'Un ou deux', 'Quelques-uns', 'Je ne sais plus'],
  },
  {
    kind: 'ask',
    q: dict.ob.q2,
    options: ['Oui, nettement', 'Parfois', 'Non'],
  },
];

/**
 * Premier ecran apres la marque. On ne raconte rien avant d'avoir demande :
 * les deux premiers temps attendent une reponse, et c'est la reponse de la
 * personne — pas notre affirmation — qui fait le constat.
 */
export function Constat({ onNext }: P) {
  const { d } = useT();
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);

  const step = CONSTAT[i];
  const last = i >= CONSTAT.length - 1;
  const answered = step.kind === 'say' || answer !== null;

  const advance = () => {
    if (last) { onNext(); return; }
    setAnswer(null);
    setI((n) => n + 1);
  };

  return (
    <Screen
      /*
        Le bouton est TOUJOURS la, desactive tant qu'on n'a pas repondu.
        Un libelle vide ne desactive pas le pied de page : il le supprime. La
        reponse le faisait donc apparaitre, le contenu centre verticalement
        remontait d'autant, et les cases se relevaient sous le doigt au moment
        precis ou l'on en choisissait une.
      */
      cta={d.ob.keepGoing}
      onPress={advance}
      disabled={!answered}
      center
      hue={i >= 2 ? 'ember' : 'deep'}
    >
      <Animated.View key={i} entering={FadeIn.duration(520)}>
        <Typewriter
          text={step.q}
          variant="displayM"
          speed={44}
          style={st.center}
        />

        {step.kind === 'ask' && step.honest ? (
          <Animated.View entering={FadeIn.delay(1300).duration(420)}>
            <Text variant="lead" tone="tertiary" style={[st.center, { marginTop: space.sm }]}>
              Honnêtement…
            </Text>
          </Animated.View>
        ) : null}

        {step.kind === 'say' && step.sub ? (
          <Animated.View entering={FadeIn.delay(1100).duration(520)}>
            <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.lg }]}>
              {step.sub}
            </Text>
          </Animated.View>
        ) : null}

        {step.kind === 'ask' && (
          <Animated.View
            entering={FadeIn.delay(900).duration(520)}
            style={{ marginTop: space.xl, gap: space.md }}
          >
            {step.options.map((label, k) => (
              <SelectCard
                key={label}
                label={label}
                selected={answer === k}
                onPress={() => setAnswer(k)}
              />
            ))}
          </Animated.View>
        )}
      </Animated.View>
    </Screen>
  );
}

/* ---------- Le manifeste ---------- */

/**
 * Cinq lignes qui s'ecrivent l'une apres l'autre, la derniere en grand.
 *
 * Chaque ligne demarre quand la precedente a fini : les delais se calculent
 * a partir de la duree de frappe, ils ne sont pas devines. Les lignes deja
 * ecrites s'effacent d'un cran pour que l'oeil suive celle qui s'ecrit.
 */
const LINES = [
  dict.ob.man1, dict.ob.man4, dict.ob.man2, dict.ob.man5, dict.ob.man3,
];
const LAST = dict.ob.manLast;
const SPEED = 26;

export function Manifesto({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  // Chaque ligne part quand la precedente est finie.
  const starts: number[] = [];
  let t = 260;
  for (const l of LINES) {
    starts.push(t);
    t = typeDuration(l, SPEED, t);
  }
  const lastStart = t + 260;

  return (
    <Screen
      cta="Appuie pour continuer"
      onPress={onNext}
      hintDelay={lastStart + 900}
      tapToContinue
      center
      hue="accent"
    >
      <View style={{ gap: space.md }}>
        {LINES.map((l, i) => (
          <Typewriter
            key={l}
            text={l}
            variant="lead"
            speed={SPEED}
            delay={starts[i]}
            cursor={false}
            style={st.faded}
          />
        ))}

        <View style={{ height: space.lg }} />

        <Typewriter
          text={LAST}
          variant="displayM"
          speed={SPEED + 14}
          delay={lastStart}
          style={st.center}
        />
      </View>
    </Screen>
  );
}

/* ---------- Prenom ---------- */
export function Name({ onNext }: P) {
  const { d } = useT();
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const name = useOnboardingStore((x) => x.firstName);
  const setName = useOnboardingStore((x) => x.setFirstName);

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} disabled={name.trim().length < 2} center hue="deep">
      <Typewriter
        text={d.ob.namePrompt}
        variant="displayM"
        style={st.center}
      />
      <Animated.View entering={FadeIn.delay(900).duration(600)}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={d.ob.namePlaceholder}
          placeholderTextColor={withAlpha(c.mist, 0.28)}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={18}
          style={st.input}
        />
      </Animated.View>
    </Screen>
  );
}

/* ---------- Distractions ---------- */
const PICKABLE = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'X' },
  { id: 'youtube', name: 'YouTube' },
] as const;

export function Distractions({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const picked = useOnboardingStore((x) => x.distractions);
  const toggle = useOnboardingStore((x) => x.toggleDistraction);

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} disabled={picked.length === 0} hue="accent">
      <Text variant="displayM">{d.ob.distTitle}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
        {d.ob.distBody}
      </Text>

      <View style={st.list}>
        {PICKABLE.map((a) => (
          <SelectCard
            key={a.id}
            shape="check"
            label={a.name}
            lead={<Image source={LOGOS[a.id]} style={st.pickLogo} contentFit="contain" />}
            selected={picked.includes(a.id)}
            onPress={() => toggle(a.id)}
          />
        ))}
      </View>
    </Screen>
  );
}



/* ---------- Notifications ---------- */
export function NotificationsAsk({ onNext }: P) {
  const { d } = useT();
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const ask = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      track('step_viewed', { step: 'notifications', result: status });
    } catch {
      /* le refus n'empeche rien : on continue */
    }
    if (alive.current) onNext();
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen secondary={d.rate.later} onSecondary={onNext} hue="deep">
        <Text variant="displayM">{d.ob.notifTitle}</Text>
        <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
          {d.ob.notifBody}
        </Text>
      </Screen>

      <SystemAlert
        goodSide="right"
        title={d.ob.notifAlert}
        body={d.ob.notifAlertBody}
        good={d.ob.allow}
        bad={d.ob.deny}
        onGood={() => { void ask(); }}
        onBad={() => { void ask(); }}
      />
    </View>
  );
}

/* ---------- La promesse ---------- */
export function PromiseScreen({ onNext }: P) {
  const { d, t } = useT();
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const name = useOnboardingStore((x) => x.firstName);
  const minutes = useOnboardingStore((x) => x.minutesPerDay);

  // Le chiffre vient de SON temps d'ecran : trente pour cent repris sur les
  // annees qu'il y laisse. Un nombre rond invente ne vaut rien ici.
  const years = Math.max(1, Math.round(screenYears(minutes) * 0.3));
  const hours = Math.round((minutes * 0.3 * 365) / 60);

  return (
    <Screen cta={d.ob.letsGo} onPress={onNext} hue="accent">
      {/*
        Corti rayonnante ouvre la promesse.
        C'etait le dernier ecran du parcours sans rien a regarder, et c'est
        celui qui porte le plus : elle montre l'etat d'arrivee pendant qu'on
        lit ce qu'il vaut.
      */}
      <Animated.View entering={FadeIn.duration(620)} style={st.mascot}>
        {/* En cours de retablissement : le sommet est reserve au paywall,
            qui le propose. Trois ecrans de suite au niveau maximum et le
            progres ne veut plus rien dire. */}
        <Corti level={2} size={140} />
      </Animated.View>

      <Text variant="displayM" style={st.center}>
        {name ? `${name}, ` : ''}UnSwipe te rendra{' '}
        <Text variant="displayM" color={c.accent}>{years} ans</Text>
        {' de ta vie'}
      </Text>

      <View style={{ marginTop: space.xxl, gap: space.lg }}>
        <PromiseRow title={d.ob.promise1} />
        <PromiseRow title={d.ob.promise2} />
        <PromiseRow title={t(d.ob.promise3, { n: hours })} />
      </View>
    </Screen>
  );
}

/** Une promesse : une pastille, une ligne. Rien dessous. */
function PromiseRow({ title }: { title: string }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.promise}>
      <View style={st.pip} />
      <Text variant="title" style={{ flex: 1 }}>{title}</Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  center: { textAlign: 'center' },
  mascot: { alignItems: 'center', marginBottom: space.lg },
  aside: { marginBottom: space.xl },
  // Les lignes deja ecrites reculent d'un cran : l'oeil suit celle qui
  // s'ecrit, sans perdre ce qui precede.
  faded: { textAlign: 'center', opacity: 0.55 },
  input: {
    marginTop: space.xl, height: 62, borderRadius: 20, textAlign: 'center',
    color: c.mist, fontFamily: 'SansSemi', fontSize: 22,
    backgroundColor: withAlpha(c.mist, 0.06),
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.18),
  },
  list: { marginTop: space.xl, gap: space.md },
  pickLogo: { width: 30, height: 30 },
  essential: { marginTop: space.xxl, padding: space.lg, gap: space.md },
  essGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', rowGap: space.lg,
  },
  // Trois par ligne : les six tiennent sur deux rangees sans serrer.
  essTile: { width: '31%', alignItems: 'center', gap: 6 },
  essIcon: { width: 52, height: 52 },
  phone: {
    marginTop: space.xxl, alignSelf: 'center', width: 232, borderRadius: 34,
    padding: space.md, paddingTop: space.lg,
    backgroundColor: withAlpha(c.mist, 0.04),
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.14),
  },
  notch: {
    alignSelf: 'center', width: 62, height: 6, borderRadius: 3,
    backgroundColor: withAlpha(c.mist, 0.16), marginBottom: space.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  gridIcon: { width: 42, height: 42, borderRadius: 11 },
  gridGhost: {
    width: 42, height: 42, borderRadius: 11,
    backgroundColor: withAlpha(c.mist, 0.05),
  },
  ruleCard: { marginTop: space.lg, padding: space.md, gap: 4 },
  ruleHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rule: {
    width: 216, height: 292, padding: space.lg, gap: 4, overflow: 'hidden',
  },
  ruleOn: { borderColor: withAlpha(c.accent, 0.55) },
  tick: {
    position: 'absolute', right: space.lg, bottom: space.lg,
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.3),
  },
  tickOn: { backgroundColor: c.mist, borderColor: c.mist },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: space.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: withAlpha(c.mist, 0.18) },
  dotOn: { width: 20, backgroundColor: c.accent },
  promise: { flexDirection: 'row', gap: space.md },
  pip: {
    width: 10, height: 10, borderRadius: 5, marginTop: 6,
    backgroundColor: c.accent,
  },
});
