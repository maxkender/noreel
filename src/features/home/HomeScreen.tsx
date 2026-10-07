import { useCallback, useEffect, useState, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Brain, ChevronRight, Home as HomeIcon, Lock, Shield, Smartphone, User } from 'lucide-react-native';
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
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { resetFirstRun } from '@/features/client/firstrun';
import { resetTutorial } from '@/features/client/tutorial';
import { TabTour } from './Tours';
import { resetTours, type TourId } from './tourSeen';
import { useSettings } from '@/store/settings';
import { Card, Row, Toggle } from './parts';
import { useAnchor, useTourScroll } from './anchors';
import { shareApp, shareOnWhatsApp } from '@/lib/share';
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
import { ProtectionStatus, useProtect } from './Recovery';
import { CortiTab } from './CortiTab';
import { realFloorToday, stopWatching, watchReal } from '@/services/realtime';
import { pullAndRestart } from '@/services/refresh';
import { usePostModeReconcile } from '@/services/postmode';

type Tab = 'home' | 'corti' | 'block' | 'account';

export function HomeScreen() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const [tab, setTab] = useState<Tab>('home');
  // Rejouer la story d'un onglet : un compteur, pour que la meme demande deux fois passe.
  const [replay, setReplay] = useState<{ id: TourId; n: number } | null>(null);
  const [settings, setSettings] = useState(false);
  const [streak, setStreak] = useState(0);
  // L'en-tete : la visite guidee place ses cadres sous lui.
  const aFrameTop = useAnchor('frame-top');
  const [today, setToday] = useState<Today>({
    total: 0,
    perApp: { instagram: 0, tiktok: 0, twitter: 0, youtube: 0 },
  });

  /*
    Les chiffres sont RELUS a chaque retour sur l'ecran.
    Ils etaient tires d'un jeu d'exemple — « 102 minutes recuperees », « 4
    jours d'affilee » — ecrit en dur dans les mocks. On ne mesure donc que ce
    qu'on peut observer : le temps passe dans nos propres ecrans filtres.
    Le temps passe dans l'Instagram d'origine ne nous est pas accessible, et
    l'inventer serait mentir sur le seul chiffre qu'on vient verifier.
  */
  const [realFloor, setRealFloor] = useState<number | null>(null);
  const refresh = useCallback(() => {
    void usageToday().then(setToday);
    void usageStreak().then(setStreak);
    // Lecture SYNCHRONE : les seuils franchis sont deja sur le disque partage
    // quand on revient sur l'ecran, il n'y a rien a attendre.
    setRealFloor(realFloorToday());
  }, []);
  useFocusEffect(refresh);


  /*
    Corti a son onglet a lui.

    Son pourcentage etait affiche a trois endroits sans qu'on dise nulle part
    ce qu'il mesure. Un chiffre sans regle se lit soit comme un verdict, soit
    comme une decoration — et dans les deux cas on cesse de le regarder. Il a
    donc sa page, avec la regle entiere, malus compris.
  */
  const tabs: [Tab, string, typeof HomeIcon][] = [
    ['home', d.nav.home, HomeIcon],
    ['corti', d.nav.corti, Brain],
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
      <SafeAreaView ref={aFrameTop} collapsable={false} edges={['top']} style={st.headWrap}>
        <Header
          onSettings={() => setSettings(true)}
          onProfile={() => setTab('account')}
        />
      </SafeAreaView>

      <Animated.View key={tab} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
        {tab === 'home' && (
          <HomeTab minutes={today.perApp} onBlock={() => setTab('block')} />
        )}
        {tab === 'corti' && <CortiTab onTour={() => setReplay((r) => ({ id: 'corti', n: (r?.n ?? 0) + 1 }))} />}
        {tab === 'block' && (
          <BlockTab
            minutes={today.perApp}
            total={today.total}
            streak={streak}
            realFloor={realFloor}
          />
        )}
        {tab === 'account' && <AccountTab />}
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

      {/* La story de l'onglet, la premiere fois — par-dessus tout. */}
      <TabTour tab={tab} replay={replay} onDone={() => setReplay(null)} />

    </View>
  );
}

/* ---------------- Applis ---------------- */

/**
 * L'accueil ne montre plus que les applis.
 *
 * Il portait la roue, trois compteurs, les apps autorisees, la detox, la
 * serie, l'idee du jour, le temps d'ecran et un raccourci : neuf blocs pour
 * une page qu'on ouvre afin d'appuyer sur une icone. Tout ce qui n'etait pas
 * l'icone est parti dans Blocage, et l'icone a pris la place.
 */
function HomeTab({
  minutes, onBlock,
}: {
  minutes: Record<string, number>;
  /** Mene a l'onglet Blocage : c'est la que le vrai Instagram se ferme. */
  onBlock: () => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const router = useRouter();
  const homeDone = useSettings((x) => x.homeShortcutsDone);
  const blocking = useSettings((x) => x.blocking);
  const selection = useSettings((x) => x.selection);
  // Tant que l'app d'origine n'est pas fermee, on le rappelle ici.
  const realOpen = !(blocking && selection);
  // Les ancres de la visite guidee : elle eclaire ces elements-la.
  const [listRef, onListScroll] = useTourScroll('home');
  const aAdd = useAnchor('home-addHome');
  const aBlock = useAnchor('home-blockReal');
  const aApps = useAnchor('home-apps');

  return (
    <Animated.ScrollView
      ref={listRef}
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onListScroll}
      scrollEventThrottle={16}
    >
      {/*
        Un badge en haut, a la place de Corti : « ajouter les apps a l'ecran
        d'accueil ». C'est le geste qui fait qu'on ouvre UnSwipe au lieu de
        l'original, et il ne se fait qu'une fois — une fois fait, le badge
        s'en va. Corti, lui, a son onglet.
      */}
      {!homeDone && (
        <Pressable
          ref={aAdd}
          collapsable={false}
          onPress={() => { haptics.tap(); router.push('/widgets'); }}
          style={[st.addHome, { borderColor: withAlpha(c.accent, 0.45), backgroundColor: withAlpha(c.accent, 0.12) }]}
          accessibilityRole="button"
        >
          <Smartphone size={15} strokeWidth={2.2} color={c.accent} />
          <Text variant="label" color={c.accent} style={{ flex: 1 }}>{d.misc.addHome}</Text>
          <ChevronRight size={15} strokeWidth={2.2} color={c.accent} />
        </Pressable>
      )}

      {/* « Bloquer le vrai Instagram ? » : filtrer ici ne sert a rien si
          l'app d'origine reste a un tap. Le badge mene a l'onglet Blocage et
          s'en va une fois le blocage arme sur une selection. */}
      {realOpen && (
        <Pressable
          ref={aBlock}
          collapsable={false}
          onPress={() => { haptics.tap(); onBlock(); }}
          style={[st.addHome, { borderColor: withAlpha(c.ember, 0.5), backgroundColor: withAlpha(c.ember, 0.12) }]}
          accessibilityRole="button"
        >
          <Lock size={15} strokeWidth={2.2} color={c.ember} />
          <View style={{ flex: 1 }}>
            <Text variant="label" color={c.ember}>{d.misc.blockReal}</Text>
            <Text variant="label" tone="tertiary">{d.misc.blockRealB}</Text>
          </View>
          <ChevronRight size={15} strokeWidth={2.2} color={c.ember} />
        </Pressable>
      )}

      <View ref={aApps} collapsable={false}>
        <AppSlider minutes={minutes} />
      </View>
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
  minutes, total, streak, realFloor,
}: {
  minutes: Record<string, number>;
  total: number;
  streak: number;
  /** Le plancher iOS pour les VRAIES apps, ou nul quand on ne sait pas. */
  realFloor: number | null;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [auth, setAuth] = useState<string>('notDetermined');
  const hard = useSettings((x) => x.hardMode);
  const selection = useSettings((x) => x.selection);
  const goal = useSettings((x) => x.goalMinutes);
  const setSetting = useSettings((x) => x.set);
  const blockingOn = useSettings((x) => x.blocking);
  // Revenu de la vraie app apres une publication : le blocage se remet.
  usePostModeReconcile(selection, blockingOn);
  const [gate, setGate] = useState(false);
  const [intro, setIntro] = useState(false);
  const [paywall, setPaywall] = useState(false);
  // Le registre de la protection, pour l'etat du filtre.
  const { s: prot } = useProtect();
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
    /*
      Les seuils se posent AVEC le blocage, sur la meme selection.
      Apple ne dit jamais combien de temps a ete passe dans une app ; il
      accepte seulement de prevenir quand un seuil est franchi. C'est le seul
      moyen honnete de savoir quelque chose du vrai temps d'ecran, et il faut
      l'avoir demande AVANT — un reveil pose ce soir ne raconte pas la matinee.
    */
    void watchReal(selection);
  };

  const disarm = () => {
    setOn(false);
    setSetting('blocking', false);
    void shield.setActive(false, selection);
    stopWatching();
  };

  const pct = Math.min(100, Math.round((total / Math.max(goal, 1)) * 100));
  // Les ancres de la visite guidee.
  const [listRef, onListScroll] = useTourScroll('block');
  const aStatus = useAnchor('block-status');
  const aBtn = useAnchor('block-btn');
  const aStrict = useAnchor('block-strict');

  return (
    <Animated.ScrollView
      ref={listRef}
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onListScroll}
      scrollEventThrottle={16}
    >
      <Text variant="displayM">{d.block.title}</Text>

      {/*
        Ce qu'on a recupere vient AVANT ce qu'on a consomme.
        Les trois chiffres du jour — temps passe, serie, part du plafond —
        disent tous ce qu'on a depense. Ouvrir sur une depense fait un releve
        de compte ; ouvrir sur les reels evites et le temps repris fait un
        bilan. C'est ce second chiffre qui justifie l'abonnement a la fin du
        mois, donc c'est lui qu'on voit en premier.
      */}
      {/*
        Corti n'est plus ici : il a son onglet.

        Sa scene tenait le haut de cette page, et elle y faisait double emploi
        depuis qu'il a le sien — on voyait la meme soucoupe et la meme jauge a
        deux endroits, et l'onglet blocage, qui parle d'interrupteurs et
        d'applications choisies, ouvrait sur une mascotte. Il ouvre maintenant
        sur ce qu'on vient y regler.
      */}
      {/* Le filtre ne parle que s'il a un doute : une page qui dit « tout va
          bien » a chaque ouverture finit par ne plus etre lue. */}
      {prot?.shaky && (
        <ProtectionStatus s={prot} onFix={() => { haptics.press(); void pullAndRestart(); }} />
      )}

      {/* Puis les trois chiffres du jour : le temps passe dans les versions
          filtrees, les jours d'affilee, et la part du plafond du jour. */}
      <Glass radius={22} intensity={55} warmEdge="none" style={st.strip}>
        <Stat label={d.blockTab.today} value={formatHours(total)} />
        <View style={st.stripLine} />
        <Stat label={d.blockTab.streak} value={t(d.duration.daysShort, { n: streak })} />
        <View style={st.stripLine} />
        <Stat label={d.blockTab.ofCap} value={`${pct} %`} />
      </Glass>

      <View ref={aStatus} collapsable={false} style={[st.status, on ? st.statusOn : st.statusOff, !pro && st.dimmed]}>
        <View style={[st.statusRing, on && st.statusRingOn]}>
          <Shield size={26} strokeWidth={1.8} color={on ? c.accent : withAlpha(c.mist, 0.5)} />
        </View>
        <Text variant="title" style={{ textAlign: 'center' }}>
          {on ? d.blockTab.onTitle : d.blockTab.offTitle}
        </Text>
        {/* Une phrase seulement quand il y a quelque chose a FAIRE. */}
        {(needsAuth || !selection) && (
          <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
            {needsAuth ? d.blockTab.needAuth : d.blockTab.pick}
          </Text>
        )}
        <Pressable
          ref={aBtn}
          collapsable={false}
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
            {!pro ? d.blockTab.unlock
              : needsAuth ? d.block.authorize
              : !selection ? d.blockTab.choose
              : on ? d.blockTab.turnOff : d.blockTab.turnOn}
          </Text>
        </Pressable>
      </View>

      <Card>
        <Row
          title={d.blockTab.more}
          onPress={() => (pro ? router.push('/picker') : setPaywall(true))}
          right={pro
            ? <Text variant="body" tone="tertiary">›</Text>
            : <LockedPill label="Pro" onPress={() => setPaywall(true)} />}
        />
        <View ref={aStrict} collapsable={false}>
        <Row
          title={d.ui.hardTitle}
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
        </View>
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

      <ScreenTime minutes={minutes} realFloor={realFloor} />

      <Card>
        <Row
          title={d.block.homeScreen}
          onPress={() => router.push('/widgets')}
          right={<Text variant="body" tone="tertiary">›</Text>}
        />
      </Card>
    </Animated.ScrollView>
  );
}

/* ---------------- Compte ---------------- */
function AccountTab() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [sources, setSources] = useState(false);
  const { d } = useT();
  const router = useRouter();
  const minutes = useOnboardingStore(effectiveMinutes);
  const age = useOnboardingStore((x) => x.age);
  const reset = useOnboardingStore((x) => x.reset);

  return (
    <Animated.ScrollView
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
    >
      <Text variant="displayM">{d.account.title}</Text>

      <Text variant="label" tone="secondary" style={st.section}>{d.ui.subscription}</Text>
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

      <Text variant="label" tone="secondary" style={st.section}>{d.ui.share}</Text>
      <Card>
        <Row title={d.ui.shareWhatsApp} onPress={() => { void shareOnWhatsApp(); }} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.ui.shareLink} onPress={() => { void shareApp(); }} right={<Text variant="body" tone="tertiary">›</Text>} />
      </Card>

      <Text variant="label" tone="secondary" style={st.section}>{d.ui.assistance}</Text>
      <Card>
        <Row title={d.blockTab.shortcuts} onPress={() => router.push('/widgets')} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.sources.title} onPress={() => setSources(true)} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.account.restart} onPress={() => { reset(); void resetFirstRun(); void resetTutorial(); void resetTours(); router.replace('/onboarding'); }} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.account.version} right={<Text variant="body" tone="secondary">{Constants.expoConfig?.version ?? ''} · {Platform.OS}</Text>} />
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
  addHome: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'center',
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, marginBottom: space.lg,
  },
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
