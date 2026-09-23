import { useEffect, useState, useMemo } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, useAnimatedScrollHandler } from 'react-native-reanimated';
import { Home as HomeIcon, Shield, User } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
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
import { Card, Row, Pill, Toggle } from './parts';
import { AppSlider } from './AppSlider';
import { Header } from './Header';
import { ScreenTime } from './ScreenTime';
import { NavBar } from './NavBar';
import { Sources } from './Sources';
import { AppleSignIn } from './AppleSignIn';
import { Settings } from './Settings';
import { HardMode, HardModeIntro } from './HardMode';

const STREAK_PNG = require('@/assets/brand/streak.png');

type Tab = 'home' | 'block' | 'account';

export function HomeScreen() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const [tab, setTab] = useState<Tab>('home');
  const [settings, setSettings] = useState(false);
  const [streak, setStreak] = useState(0);
  const onScroll = useAnimatedScrollHandler(() => {});

  useEffect(() => { void stats.streakDays().then(setStreak); }, []);


  const tabs: [Tab, string, typeof HomeIcon][] = [
    ['home', d.nav.home, HomeIcon],
    ['block', d.nav.block, Shield],
    ['account', d.nav.account, User],
  ];

  return (
    <View style={st.root}>
      <Glow />
      <Stars />
      {/* L'en-tete est DANS le flux, opaque, et le contenu commence dessous.
          Trois effets ont ete essayes pour la faire flotter — degrade, flou,
          filet — et chacun laissait une bordure qui se voit. Ici il n'y a
          plus de bordure a rater : rien ne passe derriere. */}
      <SafeAreaView edges={['top']} style={st.headWrap}>
        <Header
          onSettings={() => setSettings(true)}
          onProfile={() => setTab('account')}
        />
      </SafeAreaView>

      <Animated.View key={tab} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
        {tab === 'home' && <HomeTab streak={streak} onScroll={onScroll} />}
        {tab === 'block' && <BlockTab onScroll={onScroll} />}
        {tab === 'account' && <AccountTab onScroll={onScroll} />}
      </Animated.View>

      <Settings visible={settings} onClose={() => setSettings(false)} />

      {/* Le contenu se dissout avant d'atteindre la barre. */}
      <LinearGradient
        colors={[
          'transparent',
          withAlpha(c.night, 0.14),
          withAlpha(c.night, 0.46),
          withAlpha(c.night, 0.8),
          c.night,
        ]}
        locations={[0, 0.2, 0.45, 0.72, 1]}
        style={st.hem}
        pointerEvents="none"
      />

      <NavBar tabs={tabs} value={tab} onChange={setTab} />

      {/* La lame de verre passe a chaque changement d'onglet. */}
      <GlassSweep key={tab} />

    </View>
  );
}

/* ---------------- Accueil ---------------- */
type Scroll = ReturnType<typeof useAnimatedScrollHandler>;

function HomeTab({ streak, onScroll }: { streak: number; onScroll: Scroll }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
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
            void shield.setActive(v, useSettings.getState().selection);
          }}
        >
          <LinearGradient
            colors={[withAlpha(c.accent, 0.35), withAlpha(c.accentDeep, 0.28), withAlpha(c.accentWarm, 0.22)]}
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
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.stat}>
      <Text variant="title" color={c.accent}>{value}</Text>
      <Text variant="label" tone="tertiary">{label}</Text>
    </View>
  );
}

/* ---------------- Blocage ---------------- */
function BlockTab({ onScroll }: { onScroll: Scroll }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [auth, setAuth] = useState<string>('notDetermined');
  const hard = useSettings((x) => x.hardMode);
  const setSetting = useSettings((x) => x.set);
  const [gate, setGate] = useState(false);
  const [intro, setIntro] = useState(false);

  /**
   * Le seul endroit ou le blocage se rend.
   *
   * Avec le mode strict arme, on n'eteint pas : on ouvre la porte. C'est
   * elle qui rappellera au bout de trois minutes.
   */
  const disarm = () => {
    setOn(false);
    useSettings.getState().set('blocking', false);
    void shield.setActive(false, useSettings.getState().selection);
  };

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
          <Shield size={26} strokeWidth={1.8} color={armed ? c.accent : withAlpha(c.mist, 0.5)} />
        </View>
        <Text variant="title" style={{ textAlign: 'center' }}>
          {armed ? d.block.shieldOn : d.block.shieldOff}
        </Text>
        <Pressable
          onPress={() => {
            haptics.press();
            if (on) {
              if (hard) { setGate(true); return; }
              disarm();
              return;
            }
            setOn(true);
            useSettings.getState().set('blocking', true);
            void shield.setActive(true, useSettings.getState().selection);
          }}
          style={[st.statusBtn, armed && st.statusBtnOn]}
        >
          <Text
            variant="button"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            color={armed ? c.night : c.mist}
          >
            {armed ? d.block.pause : d.block.activate}
          </Text>
        </Pressable>
      </View>

      <Card>
        <Row
          title="Mode strict"
          body={hard
            ? 'Rendre le blocage demande une minute, une phrase et trois calculs.'
            : 'Rend la désactivation volontairement pénible. Environ trois minutes.'}
          right={
            <Toggle
              on={hard}
              onChange={(v) => {
                if (v) { setIntro(true); return; }
                // On ne DESARME pas le mode strict d'un doigt : ce serait la
                // porte de service qu'il est cense fermer.
                setGate(true);
              }}
            />
          }
        />
      </Card>

      <HardModeIntro
        visible={intro}
        onCancel={() => setIntro(false)}
        onConfirm={() => { setIntro(false); setSetting('hardMode', true); }}
      />

      <HardMode
        visible={gate}
        onCancel={() => setGate(false)}
        onPass={() => { setGate(false); setSetting('hardMode', false); disarm(); }}
      />

      <Card>
        <Row
          title="Choisir les apps à bloquer"
          body="Le sélecteur d’Apple, app par app ou par catégorie."
          onPress={() => router.push('/picker')}
          right={<Text variant="body" tone="tertiary">›</Text>}
        />
      </Card>

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
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
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

const sheet = (c: Palette) => StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.5),
  },
  section: { marginTop: space.lg },
  idea: { padding: space.lg, marginTop: space.lg },
  strip: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  stripLine: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: withAlpha(c.mist, 0.14) },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.lg, marginTop: space.lg,
  },
  detox: { padding: space.lg, marginTop: space.lg },
  detoxBtn: {
    height: 48, borderRadius: 24, marginTop: space.lg, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.28),
  },
  egg: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  eggFlame: { position: 'absolute', width: 54, height: 54, opacity: 0.9 },
  eggN: { color: c.night, marginTop: 8 },
  shortcut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.lg, paddingVertical: space.md, paddingHorizontal: space.lg,
    borderRadius: 18, backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.line,
  },
  status: {
    alignItems: 'center', gap: space.md, padding: space.xl, borderRadius: 22,
    borderWidth: 1,
  },
  statusOn: { borderColor: withAlpha(c.accent, 0.5), backgroundColor: withAlpha(c.accent, 0.07) },
  statusOff: { borderColor: c.lineStrong, backgroundColor: c.surface },
  statusRing: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: c.lineStrong,
  },
  statusRingOn: { borderColor: withAlpha(c.accent, 0.6) },
  statusBtn: {
    alignSelf: 'stretch', height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg,
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  statusBtnOn: { backgroundColor: c.accent, borderColor: c.accent },
  root: { flex: 1, backgroundColor: c.night },
  scroll: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: 130, gap: space.md },
  // Sans fond : pose sur le halo, un rectangle plein dessinait une bande
  // nette en travers du degrade. Le haut de l'ecran redevient continu.
  headWrap: {},
  hem: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
});
