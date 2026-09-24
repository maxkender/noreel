import { useCallback, useEffect, useState, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { shield } from '@/services';
import { today as usageToday, streak as usageStreak, type Today } from '@/services/usage';
import { FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization } from '@/services/shield.real';
import { useOnboardingStore } from '@/store/onboarding';
import { useSettings } from '@/store/settings';
import { Card, Row, Toggle } from './parts';
import { AppSlider } from './AppSlider';
import { Header } from './Header';
import { ScreenTime } from './ScreenTime';
import { NavBar } from './NavBar';
import { Sources } from './Sources';
import { AppleSignIn } from './AppleSignIn';
import { Settings } from './Settings';
import { LockedPill } from './LockedPill';
import { ProGate } from './ProGate';
import { useProStore } from '@/store/pro';
import { HardMode, HardModeIntro } from './HardMode';

type Tab = 'home' | 'block' | 'account';

export function HomeScreen() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const [tab, setTab] = useState<Tab>('home');
  const [settings, setSettings] = useState(false);
  const [streak, setStreak] = useState(0);
  const [today, setToday] = useState<Today>({
    total: 0,
    perApp: { instagram: 0, tiktok: 0, twitter: 0, youtube: 0 },
  });
  const onScroll = useAnimatedScrollHandler(() => {});

  /*
    Les chiffres sont RELUS a chaque retour sur l'ecran.
    Ils etaient tires d'un jeu d'exemple — « 102 minutes recuperees », « 4
    jours d'affilee » — ecrit en dur dans les mocks. On ne mesure donc que ce
    qu'on peut observer : le temps passe dans nos propres ecrans filtres.
    Le temps passe dans l'Instagram d'origine ne nous est pas accessible, et
    l'inventer serait mentir sur le seul chiffre qu'on vient verifier.
  */
  const refresh = useCallback(() => {
    void usageToday().then(setToday);
    void usageStreak().then(setStreak);
  }, []);
  useFocusEffect(refresh);


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
        {tab === 'home' && <HomeTab onScroll={onScroll} minutes={today.perApp} />}
        {tab === 'block' && (
          <BlockTab
            onScroll={onScroll}
            minutes={today.perApp}
            total={today.total}
            streak={streak}
          />
        )}
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

/* ---------------- Applis ---------------- */
type Scroll = ReturnType<typeof useAnimatedScrollHandler>;

/**
 * L'accueil ne montre plus que les applis.
 *
 * Il portait la roue, trois compteurs, les apps autorisees, la detox, la
 * serie, l'idee du jour, le temps d'ecran et un raccourci : neuf blocs pour
 * une page qu'on ouvre afin d'appuyer sur une icone. Tout ce qui n'etait pas
 * l'icone est parti dans Blocage, et l'icone a pris la place.
 */
function HomeTab({ onScroll, minutes }: { onScroll: Scroll; minutes: Record<string, number> }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  return (
    <Animated.ScrollView
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <AppSlider minutes={minutes} />
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

function BlockTab({
  onScroll, minutes, total, streak,
}: {
  onScroll: Scroll;
  minutes: Record<string, number>;
  total: number;
  streak: number;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [auth, setAuth] = useState<string>('notDetermined');
  const hard = useSettings((x) => x.hardMode);
  const selection = useSettings((x) => x.selection);
  const goal = useSettings((x) => x.goalMinutes);
  const setSetting = useSettings((x) => x.set);
  const [gate, setGate] = useState(false);
  const [intro, setIntro] = useState(false);
  const [paywall, setPaywall] = useState(false);
  // Le blocage des apps d'origine et le mode strict sont payants : grises et
  // cadenasses plutot qu'absents, pour qu'on voie ce qu'on n'a pas.
  const pro = useProStore((x) => x.pro);

  useEffect(() => {
    void shield.isActive().then(setOn);
    void authorizationStatus().then(setAuth);
  }, []);

  const ready = FAMILY_CONTROLS_ENABLED && auth !== 'unsupported';
  const needsAuth = ready && auth !== 'approved';

  /**
   * Armer, c'est bloquer une SELECTION.
   *
   * Les jetons de Temps d'ecran sont chiffres et ne se fabriquent que dans
   * le selecteur d'Apple : aucune app ne peut cocher Instagram a ta place.
   * Sans selection on n'arme donc pas dans le vide — on emmene choisir.
   */
  const arm = async () => {
    haptics.press();
    if (!pro) { setPaywall(true); return; }
    if (needsAuth) { await requestAuthorization().then(setAuth); return; }
    if (!selection) { router.push('/picker'); return; }
    setOn(true);
    setSetting('blocking', true);
    await shield.setActive(true, selection);
  };

  const disarm = () => {
    setOn(false);
    setSetting('blocking', false);
    void shield.setActive(false, selection);
  };

  const pct = Math.min(100, Math.round((total / Math.max(goal, 1)) * 100));

  return (
    <Animated.ScrollView
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Text variant="displayM">{d.block.title}</Text>

      {/* Trois chiffres, tous mesures : le temps passe dans les versions
          filtrees, les jours d'affilee, et la part du plafond du jour. */}
      <Glass radius={22} intensity={55} warmEdge="none" style={st.strip}>
        <Stat label="Aujourd’hui" value={formatHours(total)} />
        <View style={st.stripLine} />
        <Stat label="Série" value={`${streak} j`} />
        <View style={st.stripLine} />
        <Stat label="Du plafond" value={`${pct} %`} />
      </Glass>

      <View style={[st.status, on ? st.statusOn : st.statusOff, !pro && st.dimmed]}>
        <View style={[st.statusRing, on && st.statusRingOn]}>
          <Shield size={26} strokeWidth={1.8} color={on ? c.accent : withAlpha(c.mist, 0.5)} />
        </View>
        <Text variant="title" style={{ textAlign: 'center' }}>
          {on ? 'Les apps d’origine sont bloquées' : 'Bloquer les apps d’origine'}
        </Text>
        <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          {needsAuth
            ? 'Temps d’écran doit d’abord donner son accord.'
            : selection
              ? 'Instagram, TikTok, X et YouTube s’ouvrent ici, pas ailleurs.'
              : 'Choisis Instagram, TikTok, X et YouTube dans la liste d’Apple.'}
        </Text>
        <Pressable
          onPress={() => {
            if (!on) { void arm(); return; }
            haptics.press();
            // Avec le mode strict arme, on n'eteint pas : on ouvre la porte.
            if (hard) { setGate(true); return; }
            disarm();
          }}
          style={[st.statusBtn, on && st.statusBtnOn]}
        >
          <Text
            variant="button"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            color={on ? c.night : c.mist}
          >
            {!pro ? 'Débloquer'
              : needsAuth ? d.block.authorize
              : !selection ? 'Choisir les apps'
              : on ? 'Désactiver' : 'Activer'}
          </Text>
        </Pressable>
      </View>

      <Card>
        <Row
          title="Bloquer d’autres apps"
          body={selection ? 'Ajoute ce que tu veux à la liste.' : 'Jeux, actualités, tout ce qui te happe.'}
          onPress={() => (pro ? router.push('/picker') : setPaywall(true))}
          right={pro
            ? <Text variant="body" tone="tertiary">›</Text>
            : <LockedPill label="Pro" onPress={() => setPaywall(true)} />}
        />
        <Row
          title="Mode strict"
          body={hard
            ? 'Rendre le blocage demande une minute, une phrase et trois calculs.'
            : 'Rend la désactivation volontairement pénible. Environ trois minutes.'}
          right={!pro ? <LockedPill label="Pro" onPress={() => setPaywall(true)} /> : (
            <Toggle
              on={hard}
              onChange={(v) => {
                if (v) { setIntro(true); return; }
                // On ne DESARME pas le mode strict d'un doigt : ce serait la
                // porte de service qu'il est cense fermer.
                setGate(true);
              }}
            />
          )}
        />
      </Card>

      <ProGate visible={paywall} onClose={() => setPaywall(false)} />

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

      <ScreenTime minutes={minutes} />

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
  dimmed: { opacity: 0.55 },
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
