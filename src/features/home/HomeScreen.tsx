import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Home as HomeIcon, Settings as SettingsIcon, Shield, User } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glow } from '@/components/Glow';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { formatHours, locale } from '@/lib/format';
import { shield, stats, homeScreen } from '@/services';
import { FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization } from '@/services/shield.real';
import { useOnboardingStore } from '@/store/onboarding';
import { Card, Row, Toggle, Pill } from './parts';
import { AppList } from './AppList';
import { Rings } from './Rings';
import { Referral } from './Referral';
import { Settings } from './Settings';
import { useSettings } from '@/store/settings';
import { Stars } from '@/components/Stars';

type Tab = 'home' | 'block' | 'account';

export function HomeScreen() {
  const { d } = useT();
  const [tab, setTab] = useState<Tab>('home');
  const [settings, setSettings] = useState(false);

  const tabs: [Tab, string, typeof HomeIcon][] = [
    ['home', d.nav.home, HomeIcon],
    ['block', d.nav.block, Shield],
    ['account', d.nav.account, User],
  ];

  return (
    <View style={st.root}>
      <Glow />
      <Stars />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Fondu entre onglets : le changement de page ne saute plus. */}
        <Animated.View
          key={tab}
          entering={FadeIn.duration(260)}
          style={{ flex: 1 }}
        >
          {tab === 'home' && <HomeTab onSettings={() => setSettings(true)} />}
          {tab === 'block' && <BlockTab />}
          {tab === 'account' && <AccountTab onSettings={() => setSettings(true)} />}
        </Animated.View>
      </SafeAreaView>

      <Settings visible={settings} onClose={() => setSettings(false)} />

      {/* Barre flottante en verre : elle survole le contenu, elle ne le pousse pas. */}
      <View style={st.navWrap} pointerEvents="box-none">
        <View style={st.nav}>
          <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={st.navTint} />
          {/* Reflet haut : c'est lui qui donne l'epaisseur du verre. */}
          <LinearGradient
            colors={[withAlpha(colors.mist, 0.28), 'transparent']}
            style={st.navSheen}
            pointerEvents="none"
          />
          {tabs.map(([key, label, Icon]) => {
            const on = tab === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => { haptics.tap(); setTab(key); }}
                style={st.tab}
              >
                <Icon size={20} strokeWidth={1.8} color={on ? colors.accent : withAlpha(colors.mist, 0.45)} />
                <Text variant="label" color={on ? colors.accent : withAlpha(colors.mist, 0.45)}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ---------------- Accueil ---------------- */
function HomeTab({ onSettings }: { onSettings: () => void }) {
  const { d, t } = useT();
  const [today, setToday] = useState({ reclaimedMinutes: 0, goalMinutes: 120 });
  const [streak, setStreak] = useState(0);
  const goal = useSettings((x) => x.goalMinutes);
  const [banner, setBanner] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    void stats.today().then(setToday);
    void stats.streakDays().then(setStreak);
  }, []);

  const perApp = {
    instagram: Math.round(today.reclaimedMinutes * 0.4),
    tiktok: Math.round(today.reclaimedMinutes * 0.25),
    twitter: Math.round(today.reclaimedMinutes * 0.15),
    youtube: Math.round(today.reclaimedMinutes * 0.2),
  };
  const focus = Math.round((today.reclaimedMinutes / Math.max(goal, 1)) * 100);

  return (
    <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
      <View style={st.topRow}>
        <Text variant="title">NoReel</Text>
        <Pressable onPress={() => { haptics.tap(); onSettings(); }} style={st.score} hitSlop={10}>
          <SettingsIcon size={18} strokeWidth={1.8} color={colors.accent} />
        </Pressable>
      </View>

      <Rings
        items={[
          { label: 'Récupéré', value: today.reclaimedMinutes, max: goal },
          { label: 'Série', value: streak, max: 7 },
          { label: 'Objectif', value: focus, max: 100 },
        ]}
      />

      {banner && !added && (
        <Pressable
          style={st.banner}
          onPress={() => { haptics.tap(); void homeScreen.add('instagram').then(() => setAdded(true)); }}
        >
          <View style={st.bannerIcon} />
          <View style={{ flex: 1 }}>
            <Text variant="body">{d.block.homeScreen}</Text>
            <Text variant="label" tone="secondary" numberOfLines={2}>{d.block.homeScreenBody}</Text>
          </View>
          <Pressable onPress={() => setBanner(false)} hitSlop={12}>
            <Text variant="body" tone="tertiary">✕</Text>
          </Pressable>
        </Pressable>
      )}

      <Text variant="label" tone="secondary" style={st.section}>Tes apps</Text>
      <AppList minutes={perApp} />

      <View style={st.idea}>
        <Text variant="label" tone="secondary">Idée du jour</Text>
        <Text variant="body" style={{ marginTop: space.xs }}>
          {t(d.home.idea, {
            h: formatHours(today.reclaimedMinutes),
            n: Math.round((today.reclaimedMinutes * 238) / 275),
          })}
        </Text>
      </View>
    </ScrollView>
  );
}

/* ---------------- Blocage ---------------- */
function BlockTab() {
  const { d } = useT();
  const [on, setOn] = useState(true);
  const [redirect, setRedirect] = useState(false);
  const [auth, setAuth] = useState<string>('notDetermined');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    void shield.isActive().then(setOn);
    void authorizationStatus().then(setAuth);
  }, []);

  const ready = FAMILY_CONTROLS_ENABLED && auth !== 'unsupported';
  const armed = on && (!ready || auth === 'approved');

  return (
    <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
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
          onPress={() => { haptics.press(); const v = !on; setOn(v); void shield.setActive(v); }}
          style={[st.statusBtn, armed && st.statusBtnOn]}
        >
          <Text variant="button" color={armed ? colors.night : colors.mist}>
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

      <Card>
        <Row
          title={d.block.redirect}
          body={d.block.redirectBody}
          right={ready
            ? <Toggle on={redirect} onChange={setRedirect} />
            : <Pill label={d.block.screenTimeSoon} muted />}
        />
      </Card>

      <Card>
        <Row
          title={d.block.homeScreen}
          body={d.block.homeScreenBody}
          right={
            <Pill
              label={added ? '✓' : d.block.add}
              muted={added}
              onPress={added ? undefined : () => { void homeScreen.add('instagram').then(() => setAdded(true)); }}
            />
          }
        />
      </Card>
    </ScrollView>
  );
}

/* ---------------- Compte ---------------- */
function AccountTab({ onSettings }: { onSettings: () => void }) {
  const { d } = useT();
  const router = useRouter();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const age = useOnboardingStore((x) => x.age);
  const reset = useOnboardingStore((x) => x.reset);

  return (
    <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
      <View style={st.topRow}>
        <Text variant="displayM">{d.account.title}</Text>
        <Pressable onPress={() => { haptics.tap(); onSettings(); }} style={st.score} hitSlop={10}>
          <SettingsIcon size={18} strokeWidth={1.8} color={colors.accent} />
        </Pressable>
      </View>

      <Referral />

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
        <Row title={d.sources.title} onPress={() => {}} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.account.restart} onPress={() => { reset(); router.replace('/onboarding'); }} right={<Text variant="body" tone="tertiary">›</Text>} />
        <Row title={d.account.version} right={<Text variant="body" tone="secondary">1.0.0 · {Platform.OS}</Text>} />
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(colors.accent, 0.5),
  },
  section: { marginTop: space.lg },
  idea: {
    padding: space.lg, borderRadius: 18, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  header: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: space.md },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    marginHorizontal: gutter, padding: space.md, borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  bannerIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: withAlpha(colors.accent, 0.25),
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
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  statusBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  root: { flex: 1, backgroundColor: colors.night },
  scroll: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: 120, gap: space.md },
  hero: { gap: 2 },
  week: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: space.lg, height: 38 },
  bar: { flex: 1, borderRadius: 2, backgroundColor: colors.accent },
  apps: { flexDirection: 'row', gap: space.sm },
  app: {
    flex: 1, padding: space.lg, gap: 4, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  appIcon: {
    width: 34, height: 34, borderRadius: 10, marginBottom: space.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  appRing: { width: 15, height: 15, borderRadius: 8, borderWidth: 2.5, borderColor: colors.accent },
  navWrap: { position: 'absolute', left: gutter, right: gutter, bottom: 28 },
  nav: {
    flexDirection: 'row', borderRadius: 28, overflow: 'hidden', padding: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.3),
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }, elevation: 16,
  },
  navTint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.mist, 0.08),
  },
  navSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8 },
});
