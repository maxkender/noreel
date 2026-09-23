import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
} from 'react-native-reanimated';
import { Home as HomeIcon, Shield, User } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glow } from '@/components/Glow';
import { Glass } from '@/components/glass/Glass';
import { GlassSweep } from '@/components/GlassSweep';
import { Stars } from '@/components/Stars';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { formatHours } from '@/lib/format';
import { shield, stats } from '@/services';
import { FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization } from '@/services/shield.real';
import { useOnboardingStore } from '@/store/onboarding';
import { useSettings } from '@/store/settings';
import { Card, Row, Pill } from './parts';
import { AppSlider } from './AppSlider';
import { Header } from './Header';
import { ScreenTime } from './ScreenTime';
import { NavBar } from './NavBar';
import { Referral } from './Referral';
import { Sources } from './Sources';
import { AppleSignIn } from './AppleSignIn';
import { Coach } from '@/components/Coach';
import { HOME_TOUR } from './tours';
import { Settings } from './Settings';

const STREAK_PNG = require('@/assets/brand/streak.png');

type Tab = 'home' | 'block' | 'account';

export function HomeScreen() {
  const { d } = useT();
  const [tab, setTab] = useState<Tab>('home');
  const [settings, setSettings] = useState(false);
  const [streak, setStreak] = useState(0);
  // Le fondu n'existe que lorsqu'il y a quelque chose a masquer.
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const insets = useSafeAreaInsets();
  // Court, comme iOS : la barre devient opaque en 24 pt de defilement.
  const veil = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, y.value / 24)),
  }));

  useEffect(() => { void stats.streakDays().then(setStreak); }, []);

  // La visite ne se joue qu'a la premiere ouverture, et se souvient.
  const toured = useSettings((x) => x.toured);
  const setSetting = useSettings((x) => x.set);

  const tabs: [Tab, string, typeof HomeIcon][] = [
    ['home', d.nav.home, HomeIcon],
    ['block', d.nav.block, Shield],
    ['account', d.nav.account, User],
  ];

  return (
    <View style={st.root}>
      <Glow />
      <Stars />
      {/* Le contenu passe SOUS l'en-tete et s'y efface : c'est le fondu qui
          tient les deux ensemble, pas une barre posee au-dessus. */}
      <Animated.View
        key={tab}
        entering={FadeIn.duration(220)}
        style={{ flex: 1 }}
      >
        {tab === 'home' && <HomeTab streak={streak} onScroll={onScroll} />}
        {tab === 'block' && <BlockTab onScroll={onScroll} />}
        {tab === 'account' && <AccountTab onScroll={onScroll} />}
      </Animated.View>

      {/* Une barre, pas un fondu.
          Trois versions de degrade ont echoue pour la meme raison : un
          degrade a forcement une fin, et cette fin se voit. Ici il n'y en a
          pas — un flou qui s'arrete net sur un filet d'un pixel, comme la
          barre de navigation d'iOS. */}
      <Animated.View
        style={[st.veil, { height: insets.top + 56 }, veil]}
        pointerEvents="none"
      >
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={st.veilTint} />
        <View style={st.veilLine} />
      </Animated.View>

      <SafeAreaView style={st.headWrap} edges={['top']} pointerEvents="box-none">
        <Header
          onSettings={() => setSettings(true)}
          onProfile={() => setTab('account')}
        />
      </SafeAreaView>

      <Settings visible={settings} onClose={() => setSettings(false)} />

      {/* Le contenu se dissout avant d'atteindre la barre. */}
      <LinearGradient
        colors={[
          'transparent',
          withAlpha(colors.night, 0.14),
          withAlpha(colors.night, 0.46),
          withAlpha(colors.night, 0.8),
          colors.night,
        ]}
        locations={[0, 0.2, 0.45, 0.72, 1]}
        style={st.hem}
        pointerEvents="none"
      />

      <NavBar tabs={tabs} value={tab} onChange={setTab} />

      {/* La lame de verre passe a chaque changement d'onglet. */}
      <GlassSweep key={tab} />

      <Coach
        steps={HOME_TOUR}
        visible={!toured.home}
        onDone={() => setSetting('toured', { ...toured, home: true })}
      />
    </View>
  );
}

/* ---------------- Accueil ---------------- */
type Scroll = ReturnType<typeof useAnimatedScrollHandler>;

function HomeTab({ streak, onScroll }: { streak: number; onScroll: Scroll }) {
  const { d, t } = useT();
  const router = useRouter();
  const [today, setToday] = useState({ reclaimedMinutes: 0, goalMinutes: 120 });
  const goal = useSettings((x) => x.goalMinutes);
  const [detox, setDetox] = useState(false);

  useEffect(() => { void stats.today().then(setToday); }, []);

  const perApp = {
    instagram: Math.round(today.reclaimedMinutes * 0.4),
    tiktok: Math.round(today.reclaimedMinutes * 0.25),
    twitter: Math.round(today.reclaimedMinutes * 0.15),
    youtube: Math.round(today.reclaimedMinutes * 0.2),
  };
  const focus = Math.min(100, Math.round((today.reclaimedMinutes / Math.max(goal, 1)) * 100));

  return (
    <Animated.ScrollView
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Les apps d'abord : c'est ce qu'on vient chercher. */}
      <AppSlider minutes={perApp} />

      <Glass radius={22} intensity={55} warmEdge="none" style={st.strip}>
        <Stat label="Récupéré" value={formatHours(today.reclaimedMinutes)} />
        <View style={st.stripLine} />
        <Stat label="Série" value={`${streak} j`} />
        <View style={st.stripLine} />
        <Stat label="Objectif" value={`${focus} %`} />
      </Glass>

      {/* Toujours autorisees : on rassure avant de bloquer. */}
      <Glass radius={22} intensity={45} warmEdge="none" style={st.cardRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title">Toujours autorisées ?</Text>
          <Text variant="body" tone="secondary">
            Plans, Uber, tes apps de santé : elles ne seront jamais bloquées.
          </Text>
        </View>
        <Pill label="Configurer" onPress={() => { haptics.tap(); void Linking.openSettings(); }} />
      </Glass>

      {/* Detox : le geste fort, mis en avant. */}
      <Glass radius={22} intensity={45} warmEdge="none" style={st.detox}>
        <Text variant="title">L’heure d’une détox ?</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: space.xs }}>
          Passe quelques heures hors ligne, ou même une semaine si tu oses.
        </Text>
        <Pressable
          style={st.detoxBtn}
          onPress={() => {
            haptics.press();
            const v = !detox;
            setDetox(v);
            useSettings.getState().set('blocking', v);
            void shield.setActive(v);
          }}
        >
          <LinearGradient
            colors={[withAlpha(colors.accent, 0.35), withAlpha(colors.accentDeep, 0.28), withAlpha(colors.accentWarm, 0.22)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text variant="button" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {detox ? '■  Arrêter la détox' : '▶  Commencer la détox'}
          </Text>
        </Pressable>
      </Glass>

      {/* Premier pas : la serie devient une recompense visible. */}
      <Glass radius={22} intensity={45} warmEdge="none" style={st.cardRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title">{streak > 0 ? 'Série en cours' : 'Premier pas franchi'}</Text>
          <Text variant="body" tone="secondary">
            {streak > 0
              ? `${streak} jour${streak > 1 ? 's' : ''} sans doomscroll. Ne casse pas la chaîne.`
              : 'Tu as commencé. C’est le plus dur. Ton futur toi te remercie déjà.'}
          </Text>
        </View>
        <View style={st.egg}>
          <Image source={STREAK_PNG} style={st.eggFlame} contentFit="contain" />
          <Text variant="title" style={st.eggN}>{streak}</Text>
        </View>
      </Glass>

      <Glass radius={22} intensity={45} warmEdge="none" style={st.idea}>
        <Text variant="label" tone="tertiary">IDÉE DU JOUR</Text>
        <Text variant="body" style={{ marginTop: space.xs }}>
          {t(d.home.idea, {
            h: formatHours(today.reclaimedMinutes),
            n: Math.round((today.reclaimedMinutes * 238) / 275),
          })}
        </Text>
      </Glass>

      <ScreenTime minutes={perApp} />

      <Pressable style={st.shortcut} onPress={() => { haptics.tap(); router.push('/widgets'); }}>
        <Text variant="body">Mettre les apps sur l’écran d’accueil</Text>
        <Text variant="body" tone="tertiary">›</Text>
      </Pressable>
    </Animated.ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.stat}>
      <Text variant="title" color={colors.accent}>{value}</Text>
      <Text variant="label" tone="tertiary">{label}</Text>
    </View>
  );
}

/* ---------------- Blocage ---------------- */
function BlockTab({ onScroll }: { onScroll: Scroll }) {
  const { d } = useT();
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [auth, setAuth] = useState<string>('notDetermined');

  useEffect(() => {
    void shield.isActive().then(setOn);
    void authorizationStatus().then(setAuth);
  }, []);

  const ready = FAMILY_CONTROLS_ENABLED && auth !== 'unsupported';
  const armed = on && (!ready || auth === 'approved');

  return (
    <Animated.ScrollView
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Text variant="displayM">{d.block.title}</Text>

      {/* Carte d'etat : le statut se lit d'un coup d'oeil, l'action est dessous. */}
      <View style={[st.status, armed ? st.statusOn : st.statusOff]}>
        <View style={[st.statusRing, armed && st.statusRingOn]}>
          <Shield size={26} strokeWidth={1.8} color={armed ? colors.accent : withAlpha(colors.mist, 0.5)} />
        </View>
        <Text variant="title" style={{ textAlign: 'center' }}>
          {armed ? d.block.shieldOn : d.block.shieldOff}
        </Text>
        <Pressable
          onPress={() => {
            haptics.press();
            const v = !on;
            setOn(v);
            useSettings.getState().set('blocking', v);
            void shield.setActive(v);
          }}
          style={[st.statusBtn, armed && st.statusBtnOn]}
        >
          <Text
            variant="button"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            color={armed ? colors.night : colors.mist}
          >
            {armed ? d.block.pause : d.block.activate}
          </Text>
        </Pressable>
      </View>

      <Card>
        <Row
          title={d.block.screenTime}
          body={d.block.screenTimeBody}
          right={
            ready
              ? <Pill
                  label={auth === 'approved' ? '✓' : d.block.authorize}
                  muted={auth === 'approved'}
                  onPress={auth === 'approved' ? undefined : () => { void requestAuthorization().then(setAuth); }}
                />
              : <Pill label={d.block.screenTimeSoon} muted />
          }
        />
      </Card>

      {/* Les deux lignes suivantes menaient a un interrupteur sans effet et
          a un service muet. iOS n'expose aucune API pour rediriger une app
          ni pour poser une icone : le seul chemin qui marche passe par
          Raccourcis, et c'est la qu'elles menent maintenant. */}
      <Card>
        <Row
          title={d.block.redirect}
          body="Un raccourci ouvre la version filtrée à la place de l’app d’origine."
          onPress={() => router.push('/widgets')}
          right={<Text variant="body" tone="tertiary">›</Text>}
        />
      </Card>

      <Card>
        <Row
          title={d.block.homeScreen}
          body={d.block.homeScreenBody}
          onPress={() => router.push('/widgets')}
          right={<Text variant="body" tone="tertiary">›</Text>}
        />
      </Card>
    </Animated.ScrollView>
  );
}

/* ---------------- Compte ---------------- */
function AccountTab({ onScroll }: { onScroll: Scroll }) {
  const [sources, setSources] = useState(false);
  const { d } = useT();
  const router = useRouter();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const age = useOnboardingStore((x) => x.age);
  const reset = useOnboardingStore((x) => x.reset);

  return (
    <Animated.ScrollView
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Text variant="displayM">{d.account.title}</Text>

      <Referral />

      <Text variant="label" tone="secondary" style={st.section}>Ton abonnement</Text>
      <Card><AppleSignIn /></Card>

      <Text variant="label" tone="secondary" style={st.section}>{d.account.profile}</Text>
      <Card>
        <Row title={d.account.screenTimeValue} right={<Text variant="body" tone="secondary">{formatHours(minutes)}</Text>} />
        <Row title={d.account.ageValue} right={<Text variant="body" tone="secondary">{age}</Text>} />
      </Card>

      <Text variant="label" tone="secondary" style={st.section}>{d.account.data}</Text>
      <Card>
        <Text variant="body" tone="secondary">{d.account.dataBody}</Text>
      </Card>

      <Text variant="label" tone="secondary" style={st.section}>Assistance</Text>
      <Card>
        <Row title="Apps sur l’écran d’accueil" onPress={() => router.push('/widgets')} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.sources.title} onPress={() => setSources(true)} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.account.restart} onPress={() => { reset(); router.replace('/onboarding'); }} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.account.version} right={<Text variant="body" tone="secondary">1.0.0 · {Platform.OS}</Text>} />
      </Card>

      <Sources visible={sources} onClose={() => setSources(false)} />
    </Animated.ScrollView>
  );
}

const st = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(colors.accent, 0.5),
  },
  section: { marginTop: space.lg },
  idea: { padding: space.lg, marginTop: space.lg },
  strip: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  stripLine: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: withAlpha(colors.mist, 0.14) },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.lg, marginTop: space.lg,
  },
  detox: { padding: space.lg, marginTop: space.lg },
  detoxBtn: {
    height: 48, borderRadius: 24, marginTop: space.lg, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.28),
  },
  egg: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  eggFlame: { position: 'absolute', width: 54, height: 54, opacity: 0.9 },
  eggN: { color: colors.night, marginTop: 8 },
  shortcut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.lg, paddingVertical: space.md, paddingHorizontal: space.lg,
    borderRadius: 18, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  status: {
    alignItems: 'center', gap: space.md, padding: space.xl, borderRadius: 22,
    borderWidth: 1,
  },
  statusOn: { borderColor: withAlpha(colors.accent, 0.5), backgroundColor: withAlpha(colors.accent, 0.07) },
  statusOff: { borderColor: colors.lineStrong, backgroundColor: colors.surface },
  statusRing: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.lineStrong,
  },
  statusRingOn: { borderColor: withAlpha(colors.accent, 0.6) },
  statusBtn: {
    alignSelf: 'stretch', height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg,
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  statusBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  root: { flex: 1, backgroundColor: colors.night },
  // La marge haute laisse passer le contenu sous l'en-tete flottante.
  scroll: { paddingHorizontal: gutter, paddingTop: 96, paddingBottom: 130, gap: space.md },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  veilTint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.night, 0.55),
  },
  veilLine: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(colors.mist, 0.14),
  },
  hem: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  headWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
});
