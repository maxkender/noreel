import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Home as HomeIcon, Shield, User } from 'lucide-react-native';
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

type Tab = 'home' | 'block' | 'account';

export function HomeScreen() {
  const { d } = useT();
  const [tab, setTab] = useState<Tab>('home');

  const tabs: [Tab, string, typeof HomeIcon][] = [
    ['home', d.nav.home, HomeIcon],
    ['block', d.nav.block, Shield],
    ['account', d.nav.account, User],
  ];

  return (
    <View style={st.root}>
      <Glow />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {tab === 'home' && <HomeTab />}
        {tab === 'block' && <BlockTab />}
        {tab === 'account' && <AccountTab />}
      </SafeAreaView>

      {/* Barre flottante en verre : elle survole le contenu, elle ne le pousse pas. */}
      <View style={st.navWrap} pointerEvents="box-none">
        <View style={st.nav}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={st.navTint} />
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
function HomeTab() {
  const { d, t } = useT();
  const router = useRouter();
  const [today, setToday] = useState({ reclaimedMinutes: 0, goalMinutes: 120 });
  const [week, setWeek] = useState<number[]>([]);

  useEffect(() => {
    void stats.today().then(setToday);
    void stats.week().then(setWeek);
  }, []);

  const hour = new Date().getHours();
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date());

  return (
    <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(300)}>
        <Text variant="displayM">{hour >= 5 && hour < 18 ? d.home.morning : d.home.evening}</Text>
        <Text variant="body" tone="secondary">{date}</Text>
      </Animated.View>

      <Card style={st.hero}>
        <Text variant="hero" numberOfLines={1} adjustsFontSizeToFit>
          {formatHours(today.reclaimedMinutes)}
        </Text>
        <Text variant="body" tone="secondary">{d.home.reclaimedToday}</Text>
        <Text variant="label" tone="tertiary" style={{ marginTop: space.sm }}>
          {t(d.home.goal, { h: formatHours(today.goalMinutes) })}
        </Text>
        <View style={st.week}>
          {week.map((m, i) => (
            <View key={i} style={[st.bar, { height: 4 + Math.min(1, m / 150) * 32 }]} />
          ))}
        </View>
      </Card>

      <View style={st.apps}>
        {([['instagram', 'Instagram', d.home.instaSub],
           ['youtube', 'YouTube', d.home.tiktokSub]] as const).map(([app, name, sub]) => (
          <Pressable
            key={app}
            style={st.app}
            onPress={() => { haptics.press(); router.push(`/client/${app}`); }}
          >
            <View style={st.appIcon}><View style={st.appRing} /></View>
            <Text variant="body">{name}</Text>
            <Text variant="label" tone="secondary">{sub}</Text>
          </Pressable>
        ))}
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

  return (
    <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
      <Text variant="displayM">{d.block.title}</Text>

      <Card>
        <Row
          title={d.block.shield}
          body={on ? d.block.shieldOn : d.block.shieldOff}
          right={<Toggle on={on} onChange={(v) => { setOn(v); void shield.setActive(v); }} />}
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
                  onPress={auth === 'approved' ? undefined : () => { void requestAuthorization().then(setAuth); }}
                  muted={auth === 'approved'}
                />
              : <Pill label={d.block.screenTimeSoon} muted />
          }
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
              onPress={added ? undefined : () => {
                void homeScreen.add('instagram').then(() => setAdded(true));
              }}
            />
          }
        />
      </Card>

      <Card>
        <Row
          title={d.block.redirect}
          body={d.block.redirectBody}
          right={<Toggle on={redirect} onChange={setRedirect} />}
        />
      </Card>
    </ScrollView>
  );
}

/* ---------------- Compte ---------------- */
function AccountTab() {
  const { d } = useT();
  const router = useRouter();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const age = useOnboardingStore((x) => x.age);
  const reset = useOnboardingStore((x) => x.reset);

  return (
    <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
      <Text variant="displayM">{d.account.title}</Text>

      <Card>
        <Text variant="label" tone="secondary">{d.account.profile}</Text>
        <Row title={d.account.screenTimeValue} right={<Text variant="body" tone="secondary">{formatHours(minutes)}</Text>} />
        <Row title={d.account.ageValue} right={<Text variant="body" tone="secondary">{age}</Text>} />
      </Card>

      <Card>
        <Text variant="label" tone="secondary">{d.account.data}</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
          {d.account.dataBody}
        </Text>
      </Card>

      <Card>
        <Row title={d.account.restart} onPress={() => { reset(); router.replace('/onboarding'); }} />
        <Row title={d.account.version} right={<Text variant="body" tone="secondary">1.0.0 · {Platform.OS}</Text>} />
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
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
    flexDirection: 'row', borderRadius: 26, overflow: 'hidden', padding: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.18),
  },
  navTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: withAlpha(colors.mist, 0.06) },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8 },
});
