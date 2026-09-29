import { useMemo, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { SelectCard } from '@/components/SelectCard';
import { Typewriter } from '@/components/type/Typewriter';
import { CortiRig, cortiReact } from '@/components/CortiRig';
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { dict, useT } from '@/i18n';
import { LIFE_YEARS, yearsOnScreen } from '../calculations';
import { SystemAlert } from '../scenes/SystemAlert';
import { SignaturePad } from '../scenes/SignaturePad';
import { Emblem } from '../scenes/Emblem';
import { Bell } from 'lucide-react-native';

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

/*
  Tout vient du dictionnaire, options comprises.
  La premiere question et ses reponses etaient ecrites ici en francais, en
  dur : l'app en anglais posait une question en francais, puis la suivante
  en anglais. Une chaine ecrite dans un ecran echappe a la parite des
  langues que le typage impose au dictionnaire — c'est la seule facon d'en
  laisser passer une.
*/
const CONSTAT: Step[] = [
  {
    kind: 'ask',
    q: dict.ob.q1,
    honest: true,
    options: [dict.ob.q1a, dict.ob.q1b, dict.ob.q1c, dict.ob.q1d],
  },
  {
    kind: 'ask',
    q: dict.ob.q2,
    options: [dict.ob.q2a, dict.ob.q2b, dict.ob.q2c],
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
              {d.ob.honestly}
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



/* ---------- Prenom ---------- */
/**
 * La bienvenue : ce qu'on va pouvoir faire, pourquoi on a construit ca, et
 * ce qui vient. Trois temps qui arrivent l'un apres l'autre, Corti qui salue.
 * Le prenom est demande juste apres — une question, pas un accueil.
 */
export function Welcome({ onNext }: P) {
  const { d } = useT();
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [hello] = useState(() => cortiReact('wave'));

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} center hue="accent">
      <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center', marginBottom: space.lg }}>
        <CortiRig level={3} size={150} expression="ravi" reaction={hello} arrive />
      </Animated.View>
      {/* Une phrase, et rien dessous : la ligne « on a cree cette app… » et
          l'annonce des questions redisaient ce que la suite montre. */}
      <Typewriter text={d.ob.welcome1} variant="displayM" speed={30} style={st.center} />
    </Screen>
  );
}

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

/* ---------- Les distractions : la liste sert a l'analyse du temps d'ecran ---------- */
export const PICKABLE = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'X' },
  { id: 'youtube', name: 'YouTube' },
] as const;




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
      <Screen emblem={<Emblem icon={Bell} />} secondary={d.rate.later} onSecondary={onNext} hue="deep">
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
const SIGNING = require('@/assets/rig/corti-pose-signe.png');

export function PromiseScreen({ onNext }: P) {
  const { d, t } = useT();
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const name = useOnboardingStore((x) => x.firstName);
  const minutes = useOnboardingStore(effectiveMinutes);
  const age = useOnboardingStore((x) => x.age);
  const [signed, setSigned] = useState(false);

  // Le chiffre vient de SON temps d'ecran et de SON age : trente pour cent
  // repris sur les annees qu'il y laisserait. Un nombre rond invente ne vaut
  // rien ici.
  const years = Math.max(1, Math.round(yearsOnScreen(minutes, LIFE_YEARS - age) * 0.3));

  return (
    <Screen cta={d.ob.commit} onPress={onNext} disabled={!signed} hue="accent">
      <Animated.View entering={FadeInDown.duration(620)} style={st.mascot}>
        {/* Corti signe, lui aussi. La pose du studio, faite pour cet ecran :
            on ne demande pas un geste qu'on ne fait pas soi-meme. */}
        <Image source={SIGNING} style={{ width: 150, height: 150 }} contentFit="contain" />
      </Animated.View>

      {/*
        Une promesse a celui qu'on sera dans cinq ans — et une signature.
        Trois promesses a LIRE ont laisse la place a une promesse a FAIRE :
        le texte s'adresse a la personne de plus tard, par son prenom, et le
        bouton reste ferme tant que le papier est blanc. Le chiffre du haut
        rappelle ce qu'il y a a reprendre, en petit : ce n'est plus le sujet
        de l'ecran, c'est sa raison.
      */}
      <Animated.View entering={FadeIn.delay(200).duration(520)}>
        <Text variant="label" color={c.accent} style={st.center}>
          {t(d.ob.promiseKick, { y: years }).toUpperCase()}
        </Text>
      </Animated.View>
      <Text variant="displayM" style={[st.center, { marginTop: space.sm }]}>
        {name ? t(d.ob.promiseNamed, { name }) : d.ob.promiseSelf}
      </Text>

      <Animated.View entering={FadeInUp.delay(500).duration(520)} style={{ marginTop: space.xl }}>
        <Text variant="label" tone="tertiary" style={[st.center, { marginBottom: space.sm }]}>
          {d.ob.signBelow}
        </Text>
        <SignaturePad onInk={setSigned} hint={d.ob.signHint} clearLabel={d.ob.signClear} />
      </Animated.View>
    </Screen>
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
