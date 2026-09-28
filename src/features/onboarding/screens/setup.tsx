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
import { Glass } from '@/components/glass/Glass';
import { SelectCard } from '@/components/SelectCard';
import { Typewriter, typeDuration } from '@/components/type/Typewriter';
import { useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { screenYears } from '../calculations';
import { SystemAlert } from '../scenes/SystemAlert';
import { LOGOS } from '@/features/home/AppSlider';

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
    q: 'Ta mémoire, ta concentration, ton plaisir : tu les sens {flancher} ?',
    options: ['Oui, nettement', 'Parfois', 'Non'],
  },
];

/**
 * Premier ecran apres la marque. On ne raconte rien avant d'avoir demande :
 * les deux premiers temps attendent une reponse, et c'est la reponse de la
 * personne — pas notre affirmation — qui fait le constat.
 */
export function Constat({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const name = useOnboardingStore((x) => x.firstName);
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
      cta={answered ? 'Continuer' : ''}
      onPress={answered ? advance : undefined}
      disabled={!answered}
      center
      hue={i >= 2 ? 'ember' : 'deep'}
    >
      <Animated.View key={i} entering={FadeIn.duration(520)}>
        <Typewriter
          text={i === 0 && name ? `${name}, ${step.q[0].toLowerCase()}${step.q.slice(1)}` : step.q}
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
  'Instagram ne fera jamais de bouton pour éteindre les Reels.',
  'Ils y perdraient trop.',
  'Alors on s’est frayé un chemin dans leur algorithme.',
  'Tes amis, tes messages, tes stories : tout reste.',
  'Ce qui disparaît, c’est seulement ce qui te retenait.',
];
const LAST = 'Bienvenue dans {UnSwipe}.';
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
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const name = useOnboardingStore((x) => x.firstName);
  const setName = useOnboardingStore((x) => x.setFirstName);

  return (
    <Screen cta="Continuer" onPress={onNext} disabled={name.trim().length < 2} center hue="deep">
      <Typewriter
        text="Bienvenue sur UnSwipe. Comment devrait-on t’appeler ?"
        variant="displayM"
        style={st.center}
      />
      <Animated.View entering={FadeIn.delay(900).duration(600)}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ton prénom"
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
  const picked = useOnboardingStore((x) => x.distractions);
  const toggle = useOnboardingStore((x) => x.toggleDistraction);

  return (
    <Screen cta="Continuer" onPress={onNext} disabled={picked.length === 0} hue="accent">
      <Text variant="displayM">Choisis tes plus grandes distractions.</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
        UnSwipe garde ta sélection sur ton téléphone.
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

/* ---------- Apps essentielles ---------- */
const ESSENTIAL = [
  { n: 'Messages', src: require('@/assets/essential/messages.png') },
  { n: 'WhatsApp', src: require('@/assets/essential/whatsapp.png') },
  { n: 'Plans', src: require('@/assets/essential/maps.png') },
  { n: 'Calendrier', src: require('@/assets/essential/calendar.png') },
  { n: 'Gmail', src: require('@/assets/essential/gmail.png') },
  { n: 'Outlook', src: require('@/assets/essential/outlook.png') },
] as const;

export function Essentials({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <Screen cta="Continuer" onPress={onNext} center hue="warm">
      <Text variant="displayM" style={st.center}>
        Les apps essentielles restent toujours accessibles.
      </Text>

      <Glass radius={26} intensity={50} warmEdge="none" style={st.essential}>
        <Text variant="label" tone="tertiary">TOUJOURS AUTORISÉ</Text>
        <View style={st.essGrid}>
          {ESSENTIAL.map((a, i) => (
            <Animated.View
              key={a.n}
              entering={FadeIn.delay(160 + i * 90).duration(420)}
              style={st.essTile}
            >
              <Image source={a.src} style={st.essIcon} contentFit="contain" />
              <Text variant="label" tone="secondary" numberOfLines={1}>{a.n}</Text>
            </Animated.View>
          ))}
        </View>
      </Glass>
    </Screen>
  );
}

/* ---------- Notifications ---------- */
export function NotificationsAsk({ onNext }: P) {
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
      <Screen secondary="Plus tard" onSecondary={onNext} hue="deep">
        <Text variant="displayM">Reçois ton rapport chaque semaine.</Text>
        <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
          Un résumé, jamais de relance.
        </Text>
      </Screen>

      <SystemAlert
        goodSide="right"
        title="« UnSwipe » souhaite t’envoyer des notifications"
        body="Les notifications peuvent inclure des alertes, des sons et des pastilles d’icône."
        good="Autoriser"
        bad="Ne pas autoriser"
        onGood={() => { void ask(); }}
        onBad={() => { void ask(); }}
      />
    </View>
  );
}

/* ---------- La promesse ---------- */
export function PromiseScreen({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const name = useOnboardingStore((x) => x.firstName);
  const minutes = useOnboardingStore((x) => x.minutesPerDay);

  // Le chiffre vient de SON temps d'ecran : trente pour cent repris sur les
  // annees qu'il y laisse. Un nombre rond invente ne vaut rien ici.
  const years = Math.max(1, Math.round(screenYears(minutes) * 0.3));
  const hours = Math.round((minutes * 0.3 * 365) / 60);

  return (
    <Screen cta="👊  C’est parti" onPress={onNext} hue="accent">
      <Text variant="displayM" style={st.center}>
        {name ? `${name}, ` : ''}UnSwipe te rendra{' '}
        <Text variant="displayM" color={c.accent}>{years} ans</Text>
        {' de ta vie'}
      </Text>

      <View style={{ marginTop: space.xxl, gap: space.lg }}>
        <PromiseRow title="Rétablissement de tes récepteurs de dopamine" />
        <PromiseRow title="Du temps libre pour faire ce que tu veux : lire, écrire, apprendre une langue" />
        <PromiseRow title={`${hours} heures récupérées dès cette année`} />
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
