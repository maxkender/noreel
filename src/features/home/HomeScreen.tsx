import { useCallback, useEffect, useState, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronRight, Home as HomeIcon, LayoutGrid, Lock, Shield, SlidersHorizontal, Smartphone, Timer, User } from 'lucide-react-native';
import { SlideToConfirm } from '@/components/SlideToConfirm';
import { PostModeSheet } from '@/features/client/PostSheet';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { GlassSweep } from '@/components/GlassSweep';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { formatHours } from '@/lib/format';
import { shield } from '@/services';
import { today as usageToday, streak as usageStreak, type Today } from '@/services/usage';
import { FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization } from '@/services/shield.real';
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { TabTour } from './Tours';
import { type TourId } from './tourSeen';
import { useSettings } from '@/store/settings';
import { Card, Row } from './parts';
import { useAnchor, useTourScroll } from './anchors';
import { shareApp, shareOnWhatsApp } from '@/lib/share';
import { AppSlider } from './AppSlider';
import { Header } from './Header';
import { NavBar } from './NavBar';
import { Sources } from './Sources';
import { AppleSignIn } from './AppleSignIn';
import { Settings } from './Settings';
import { ProGate } from './ProGate';
import { useProStore } from '@/store/pro';
import { HardMode, HardModeIntro } from './HardMode';
import { ProtectionStatus, useProtect } from './Recovery';
import { realFloorToday, stopWatching, watchReal } from '@/services/realtime';
import { pullAndRestart } from '@/services/refresh';
import { usePostModeReconcile } from '@/services/postmode';

type Tab = 'home' | 'block' | 'account';

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
  /*
    Sur Android, pas d'onglet Blocage : le blocage des vraies apps repose
    sur Temps d'ecran, qui n'existe que chez Apple. L'app y est plus simple
    — les apps filtrees, Corti, le compte — et ne promet rien qu'elle ne
    tient pas.
  */
  const tabs: [Tab, string, typeof HomeIcon][] = Platform.OS === 'ios'
    ? [
      ['home', d.nav.home, HomeIcon],
      ['block', d.nav.block, Shield],
      ['account', d.nav.account, User],
    ]
    : [
      ['home', d.nav.home, HomeIcon],
      ['account', d.nav.account, User],
    ];

  return (
    <View style={st.root}>
      {/* L'en-tete est DANS le flux, opaque, et le contenu commence dessous.
          Trois effets ont ete essayes pour la faire flotter — degrade, flou,
          filet — et chacun laissait une bordure qui se voit. Ici il n'y a
          plus de bordure a rater : rien ne passe derriere. */}
      <SafeAreaView ref={aFrameTop} collapsable={false} edges={['top']} style={st.headWrap}>
        <Header switcher={tab === 'home'} />
      </SafeAreaView>

      <Animated.View key={tab} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
        {tab === 'home' && (
          <HomeTab minutes={today.perApp} onBlock={() => setTab('block')} />
        )}
        {tab === 'block' && (
          <BlockTab
            minutes={today.perApp}
            total={today.total}
            streak={streak}
            realFloor={realFloor}
          />
        )}
        {tab === 'account' && <AccountTab onSettings={() => setSettings(true)} />}
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
  const view = useSettings((x) => x.homeView);
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
      {!homeDone && Platform.OS === 'ios' && (
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
      {realOpen && Platform.OS === 'ios' && (
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
        <AppSlider minutes={minutes} mode={view} />
      </View>
    </Animated.ScrollView>
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
  const { d } = useT();
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [auth, setAuth] = useState<string>('notDetermined');
  const hard = useSettings((x) => x.hardMode);
  const selection = useSettings((x) => x.selection);
  const setSetting = useSettings((x) => x.set);
  const blockingOn = useSettings((x) => x.blocking);
  // Revenu de la vraie app apres une publication : le blocage se remet.
  usePostModeReconcile(selection, blockingOn);
  const [gate, setGate] = useState(false);
  const [intro, setIntro] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [post, setPost] = useState(false);
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

      {/* Le filtre ne parle que s'il a un doute. */}
      {prot?.shaky && (
        <ProtectionStatus s={prot} onFix={() => { haptics.press(); void pullAndRestart(); }} />
      )}

      {/*
        LE BLOCAGE DES APPS D'ORIGINE, et rien au-dessus.
        Les trois chiffres et le temps du jour sont partis : cet onglet sert
        a regler, pas a se comparer. La carte dit quoi faire, en clair.
      */}
      <View ref={aStatus} collapsable={false} style={[st.blockCard, !pro && st.dimmed]}>
        <View style={[st.blockIcon, on && { backgroundColor: withAlpha(c.accent, 0.16) }]}>
          <Shield size={28} strokeWidth={1.8} color={on ? c.accent : withAlpha(c.mist, 0.6)} />
        </View>
        <Text variant="title" style={st.center}>{on ? d.blockTab.onTitle : d.blockTab.offTitle}</Text>
        <Text variant="body" tone="secondary" style={st.center}>
          {needsAuth ? d.blockTab.needAuth : d.blockTab.guide}
        </Text>
        <Pressable
          ref={aBtn}
          collapsable={false}
          onPress={() => {
            if (!on) { void arm(); return; }
            haptics.press();
            if (hard) { setGate(true); return; }
            disarm();
          }}
          style={[st.blockBtn, on ? st.blockBtnOff : st.blockBtnOn]}
          accessibilityRole="button"
        >
          <Text variant="button" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} color={on ? c.mist : c.night}>
            {!pro ? d.blockTab.unlock
              : needsAuth ? d.block.authorize
              : !selection ? d.blockTab.choose
              : on ? d.blockTab.turnOff : d.blockTab.turnOn}
          </Text>
        </Pressable>
      </View>

      {/* Trois carres, comme une barre d'outils : gerer, publier, l'ecran d'accueil. */}
      <View style={st.tiles}>
        <Tile
          icon={SlidersHorizontal}
          label={d.blockTab.manage}
          onPress={() => (pro ? router.push('/picker') : setPaywall(true))}
        />
        <Tile icon={Timer} label={d.client.postModeTitle} onPress={() => setPost(true)} />
        <Tile icon={LayoutGrid} label={d.misc.homeScreen} onPress={() => router.push('/widgets')} />
      </View>

      <View ref={aStrict} collapsable={false}>
        {pro ? (
          <SlideToConfirm
            label={d.blockTab.slide}
            done={hard}
            doneLabel={d.blockTab.hardOn}
            onConfirm={() => setIntro(true)}
            onDonePress={() => setGate(true)}
          />
        ) : (
          <Pressable onPress={() => setPaywall(true)}>
            <SlideToConfirm label={d.blockTab.slide} onConfirm={() => setPaywall(true)} />
          </Pressable>
        )}
      </View>

      <ProGate visible={paywall} onClose={() => setPaywall(false)} />
      <PostModeSheet visible={post} onClose={() => setPost(false)} armed={on && !!selection} />

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
    </Animated.ScrollView>
  );
}

/** Un carre d'action : une icone, un mot. */
function Tile({ icon: Icon, label, onPress }: { icon: typeof Shield; label: string; onPress: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <Pressable onPress={() => { haptics.tap(); onPress(); }} style={st.tile} accessibilityRole="button">
      <Icon size={24} strokeWidth={1.9} color={c.mist} />
      <Text variant="label" style={st.center} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
    </Pressable>
  );
}

/* ---------------- Compte ---------------- */
function AccountTab({ onSettings }: { onSettings: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [sources, setSources] = useState(false);
  const { d } = useT();
  const router = useRouter();
  const minutes = useOnboardingStore(effectiveMinutes);
  const age = useOnboardingStore((x) => x.age);

  return (
    <Animated.ScrollView
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
    >
      <Text variant="displayM">{d.account.title}</Text>

      {/* Les reglages vivent ICI, et plus dans l'en-tete de l'accueil. */}
      <Card style={{ marginTop: space.lg }}>
        <Row title={d.prefs.title} onPress={onSettings} right={<ChevronRight size={18} color={withAlpha(c.mist, 0.4)} />} />
      </Card>

      {/* La connexion Apple n'existe que chez Apple. */}
      {Platform.OS === 'ios' && (
        <>
          <Text variant="label" tone="secondary" style={st.section}>{d.ui.subscription}</Text>
          <Card><AppleSignIn /></Card>
        </>
      )}

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
        {Platform.OS === 'ios' && (
          <Row title={d.blockTab.shortcuts} onPress={() => router.push('/widgets')} right={<Text variant="body" tone="tertiary">›</Text>} />
        )}
        <Row title={d.sources.title} onPress={() => setSources(true)} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.account.version} right={<Text variant="body" tone="secondary">{Constants.expoConfig?.version ?? ''} · {Platform.OS}</Text>} />
      </Card>

      <Sources visible={sources} onClose={() => setSources(false)} />
    </Animated.ScrollView>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  center: { textAlign: 'center' },
  blockCard: {
    marginTop: space.lg, alignItems: 'center', gap: space.sm, padding: space.lg,
    borderRadius: 24, borderWidth: 1, borderColor: c.glassEdge, backgroundColor: c.glassSolid,
  },
  blockIcon: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.06), marginBottom: space.xs,
  },
  blockBtn: {
    alignSelf: 'stretch', height: 52, borderRadius: 26, marginTop: space.sm,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg,
  },
  blockBtnOn: { backgroundColor: c.mist },
  blockBtnOff: { backgroundColor: withAlpha(c.mist, 0.08), borderWidth: 1, borderColor: c.glassEdge },
  tiles: { flexDirection: 'row', gap: space.sm, marginTop: space.md, marginBottom: space.md },
  tile: {
    flex: 1, aspectRatio: 1.1, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: space.sm,
    borderWidth: 1, borderColor: c.glassEdge, backgroundColor: c.glassSolid, paddingHorizontal: space.xs,
  },
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
