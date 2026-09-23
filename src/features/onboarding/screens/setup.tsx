import { useEffect, useRef, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, Clock, Moon, Sunrise } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { SelectCard } from '@/components/SelectCard';
import { Typewriter } from '@/components/type/Typewriter';
import { haptics } from '@/lib/haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { screenYears } from '../calculations';
import { SystemAlert } from '../scenes/SystemAlert';
import { LOGOS } from '@/features/home/AppSlider';

type P = { onNext: () => void };

/* ---------- Le constat ---------- */

type Step =
  | { kind: 'ask'; q: string; options: { label: string; reply: string }[] }
  | { kind: 'say'; q: string; sub?: string };

const CONSTAT: Step[] = [
  {
    kind: 'ask',
    q: 'Combien de reels vus cette semaine saurais-tu me {raconter} ?',
    options: [
      { label: 'Aucun', reply: 'Aucun. Tu en as pourtant vu des centaines.' },
      { label: 'Un ou deux', reply: 'Deux, sur les centaines qui ont défilé.' },
      { label: 'Je ne sais plus', reply: 'Personne ne sait. C’est exactement le problème.' },
    ],
  },
  {
    kind: 'ask',
    q: 'Ta mémoire, ta concentration, ton plaisir : tu les sens {flancher} ?',
    options: [
      { label: 'Oui, nettement', reply: 'Tu l’as senti avant de savoir pourquoi.' },
      { label: 'Parfois', reply: 'Ça commence toujours par « parfois ».' },
      { label: 'Non', reply: 'Alors regarde la suite. Tu jugeras après.' },
    ],
  },
  {
    kind: 'say',
    q: 'La {dopamine} est au centre de ce qui te rend heureux.',
    sub: 'C’est elle qui donne du goût à tout le reste.',
  },
  {
    kind: 'say',
    q: 'Le réflexe de scroller abîme ta mémoire, à court comme à long terme.',
    sub: 'Les dégâts peuvent durer. Mais il n’est pas trop tard.',
  },
];

/**
 * Premier ecran apres la marque. On ne raconte rien avant d'avoir demande :
 * les deux premiers temps attendent une reponse, et c'est la reponse de la
 * personne — pas notre affirmation — qui fait le constat.
 */
export function Constat({ onNext }: P) {
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
        <Typewriter text={step.q} variant="displayM" speed={44} style={st.center} />

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
            {step.options.map((o, k) => (
              <SelectCard
                key={o.label}
                label={o.label}
                selected={answer === k}
                onPress={() => setAnswer(k)}
              />
            ))}
          </Animated.View>
        )}

        {/* La replique ne tombe qu'une fois la reponse donnee : c'est ce qui
            la rend difficile a balayer. */}
        {step.kind === 'ask' && answer !== null && (
          <Animated.View entering={FadeIn.duration(520)}>
            <Text variant="lead" color={colors.ember} style={[st.center, { marginTop: space.xl }]}>
              {step.options[answer].reply}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </Screen>
  );
}

/* ---------- Prenom ---------- *//* ---------- Prenom ---------- */
export function Name({ onNext }: P) {
  const name = useOnboardingStore((x) => x.firstName);
  const setName = useOnboardingStore((x) => x.setFirstName);

  return (
    <Screen cta="Continuer" onPress={onNext} disabled={name.trim().length < 2} center hue="deep">
      <Typewriter text="Comment t’appelles-tu ?" variant="displayM" style={st.center} />
      <Animated.View entering={FadeIn.delay(900).duration(600)}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ton prénom"
          placeholderTextColor={withAlpha(colors.mist, 0.28)}
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

/* ---------- Les regles, expliquees ---------- */
export function RulesIntro({ onNext }: P) {
  return (
    <Screen cta="Continuer" onPress={onNext} center>
      <Typewriter
        text="Les règles bloquent les apps à des heures précises."
        variant="displayM"
        speed={38}
        style={st.center}
      />

      <Animated.View entering={FadeIn.delay(1800).duration(800)} style={st.phone}>
        <View style={st.notch} />
        <View style={st.grid}>
          {['instagram', 'tiktok', 'twitter', 'youtube'].map((id) => (
            <Image key={id} source={LOGOS[id as keyof typeof LOGOS]} style={st.gridIcon} contentFit="contain" />
          ))}
          {Array.from({ length: 8 }, (_, i) => <View key={i} style={st.gridGhost} />)}
        </View>
        <Glass radius={22} intensity={55} warmEdge="none" style={st.ruleCard}>
          <View style={st.ruleHead}>
            <Clock size={16} strokeWidth={2} color={colors.accent} />
            <Text variant="label" color={colors.accent}>22:00 — 07:00</Text>
          </View>
          <Text variant="body">Nuit calme</Text>
        </Glass>
      </Animated.View>
    </Screen>
  );
}

/* ---------- Les regles proposees ---------- */
const RULES = [
  { id: 'night', icon: Moon, hours: '22:00 — 07:00', name: 'Nuit calme', why: 'Tu t’endors plus vite.' },
  { id: 'morning', icon: Sunrise, hours: '07:00 — 09:00', name: 'Matin clair', why: 'La journée commence sans fil.' },
  { id: 'focus', icon: Clock, hours: '09:00 — 12:00', name: 'Bloc concentré', why: 'Trois heures sans coupure.' },
] as const;

export function RulesPick({ onNext }: P) {
  const { width } = useWindowDimensions();
  const name = useOnboardingStore((x) => x.firstName);
  const rules = useOnboardingStore((x) => x.rules);
  const toggle = useOnboardingStore((x) => x.toggleRule);
  const [i, setI] = useState(0);
  const page = width - gutter * 2;

  return (
    <Screen cta="Continuer" onPress={onNext} disabled={rules.length === 0} center hue="deep">
      <Text variant="displayM" style={st.center}>
        {name ? `${name}, voici les règles que je te propose` : 'Voici les règles que je te propose'}
      </Text>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / page))}
        style={{ width: page, marginTop: space.xl, alignSelf: 'center' }}
      >
        {RULES.map((r) => {
          const on = rules.includes(r.id);
          const Icon = r.icon;
          return (
            <View key={r.id} style={{ width: page, alignItems: 'center' }}>
              <Pressable onPress={() => { haptics.tick(); toggle(r.id); }}>
                <Glass radius={28} intensity={55} warmEdge="none" style={[st.rule, on && st.ruleOn]}>
                  <LinearGradient
                    colors={[withAlpha(colors.accent, 0.26), withAlpha(colors.accentWarm, 0.16), 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Icon size={26} strokeWidth={1.8} color={colors.accent} />
                  <View style={{ flex: 1 }} />
                  <Text variant="label" tone="tertiary">{r.hours}</Text>
                  <Text variant="title">{r.name}</Text>
                  <Text variant="body" tone="secondary">{r.why}</Text>
                  <View style={[st.tick, on && st.tickOn]}>
                    {on && <Check size={17} strokeWidth={3} color={colors.night} />}
                  </View>
                </Glass>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <View style={st.dots}>
        {RULES.map((r, k) => <View key={r.id} style={[st.dot, k === i && st.dotOn]} />)}
      </View>
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
  const name = useOnboardingStore((x) => x.firstName);
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const years = Math.max(1, Math.round(screenYears(minutes) * 0.3));
  const target = Math.round(minutes * 0.7);
  const days = Math.round((minutes * 0.3 * 365) / 60 / 24);

  return (
    <Screen cta="👊  C’est parti" onPress={onNext} hue="accent">
      <Text variant="displayM" style={st.center}>
        {name ? `${name},\n` : ''}UnSwipe te rendra{' '}
        <Text variant="displayM" color={colors.accent}>{years} ans</Text> de ta vie
      </Text>

      <View style={{ marginTop: space.xxl, gap: space.xl }}>
        <PromiseRow
          title="30 % de temps d’écran en moins"
          body={`Passe de ${Math.round(minutes / 60)} h à ${Math.floor(target / 60)} h ${target % 60} par jour.`}
        />
        <PromiseRow
          title="Un sommeil plus profond"
          body="Moins d’écran avant de dormir, tu t’endors plus vite."
        />
        <PromiseRow
          title={`${days} jours récupérés cette année`}
          body="Du temps qui revient à toi, pas à un algorithme."
        />
      </View>
    </Screen>
  );
}

/** Une promesse : une pastille violette, un titre, une ligne. */
function PromiseRow({ title, body }: { title: string; body: string }) {
  return (
    <View style={st.promise}>
      <View style={st.pip} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title">{title}</Text>
        <Text variant="body" tone="secondary">{body}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  center: { textAlign: 'center' },
  input: {
    marginTop: space.xl, height: 62, borderRadius: 20, textAlign: 'center',
    color: colors.mist, fontFamily: 'SansSemi', fontSize: 22,
    backgroundColor: withAlpha(colors.mist, 0.06),
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.18),
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
    backgroundColor: withAlpha(colors.mist, 0.04),
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.14),
  },
  notch: {
    alignSelf: 'center', width: 62, height: 6, borderRadius: 3,
    backgroundColor: withAlpha(colors.mist, 0.16), marginBottom: space.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  gridIcon: { width: 42, height: 42, borderRadius: 11 },
  gridGhost: {
    width: 42, height: 42, borderRadius: 11,
    backgroundColor: withAlpha(colors.mist, 0.05),
  },
  ruleCard: { marginTop: space.lg, padding: space.md, gap: 4 },
  ruleHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rule: {
    width: 216, height: 292, padding: space.lg, gap: 4, overflow: 'hidden',
  },
  ruleOn: { borderColor: withAlpha(colors.accent, 0.55) },
  tick: {
    position: 'absolute', right: space.lg, bottom: space.lg,
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(colors.mist, 0.3),
  },
  tickOn: { backgroundColor: colors.mist, borderColor: colors.mist },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: space.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: withAlpha(colors.mist, 0.18) },
  dotOn: { width: 20, backgroundColor: colors.accent },
  promise: { flexDirection: 'row', gap: space.md },
  pip: {
    width: 10, height: 10, borderRadius: 5, marginTop: 6,
    backgroundColor: colors.accent,
  },
});
