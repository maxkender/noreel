import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { formatHours, locale } from '@/lib/format';
import { filteredApps, shield, stats } from '@/services';

export function HomeScreen() {
  const { d, t } = useT();
  const [today, setToday] = useState({ reclaimedMinutes: 0, goalMinutes: 120 });
  const [week, setWeek] = useState<number[]>([]);
  const [reels, setReels] = useState(0);
  const [streak, setStreak] = useState(0);
  const [on, setOn] = useState(true);

  useEffect(() => {
    void stats.today().then(setToday);
    void stats.week().then(setWeek);
    void stats.reelsAvoidedThisWeek().then(setReels);
    void stats.streakDays().then(setStreak);
    void shield.isActive().then(setOn);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 18 ? d.home.morning : d.home.evening;
  const date = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());
  const dayOne = today.reclaimedMinutes === 0;

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(300)}>
          <Text variant="displayM">{greeting}</Text>
          <Text variant="body" tone="secondary">{date}</Text>
        </Animated.View>

        <View style={st.hero}>
          {dayOne ? (
            <Text variant="body" tone="secondary">{d.home.dayOne}</Text>
          ) : (
            <>
              <Text variant="hero" style={st.big}>{formatHours(today.reclaimedMinutes)}</Text>
              <Text variant="body" tone="secondary">{d.home.reclaimedToday}</Text>
              <Text variant="label" tone="tertiary" style={{ marginTop: space.sm }}>
                {t(d.home.goal, { h: formatHours(today.goalMinutes) })}
              </Text>
            </>
          )}

          <Text variant="label" tone="secondary" style={{ marginTop: space.lg }}>
            {d.home.yourWeek}
          </Text>
          <View style={st.week}>
            {week.map((m, i) => (
              <View key={i} style={[st.bar, { height: 6 + Math.min(1, m / 150) * 34 }]} />
            ))}
          </View>
        </View>

        <View style={st.tiles}>
          {([['instagram', d.s9.appInsta, d.home.instaSub],
             ['tiktok', d.s9.appTiktok, d.home.tiktokSub]] as const).map(([app, name, sub]) => (
            <Pressable
              key={app}
              style={st.tile}
              onPress={() => { haptics.press(); void filteredApps.open(app); }}
            >
              <View style={st.tileIcon}><View style={st.tileRing} /></View>
              <Text variant="body">{name}</Text>
              <Text variant="label" tone="secondary">{sub}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[st.card, st.shieldRow]}
          onPress={() => { haptics.tap(); setOn((v) => !v); void shield.setActive(!on); }}
        >
          <Text variant="body" style={{ flex: 1 }}>
            {on ? d.home.shieldOn : d.home.shieldOff}
          </Text>
          <View style={[st.switch, on && st.switchOn]}>
            <View style={[st.knob, on && st.knobOn]} />
          </View>
        </Pressable>

        <View style={st.tiles}>
          <View style={[st.card, st.stat]}>
            <Text variant="displayM" color={colors.accent}>{dayOne ? '—' : reels}</Text>
            <Text variant="label" tone="secondary">{d.home.reelsAvoided}</Text>
          </View>
          <View style={[st.card, st.stat]}>
            <Text variant="displayM" color={colors.accent}>{dayOne ? '—' : streak}</Text>
            <Text variant="label" tone="secondary">{d.home.streak}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  scroll: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.xxl, gap: space.md },
  card: {
    padding: space.lg, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  hero: {
    padding: space.lg, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceHi,
  },
  big: {},
  week: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: space.sm, height: 42 },
  bar: { flex: 1, borderRadius: 2, backgroundColor: colors.accent },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: {
    flex: 1, padding: space.lg, gap: 4, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  tileIcon: {
    width: 32, height: 32, borderRadius: 9, marginBottom: space.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  tileRing: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: colors.mist },
  shieldRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  switch: { width: 44, height: 26, borderRadius: 13, padding: 3, backgroundColor: colors.surfaceHi },
  switchOn: { backgroundColor: colors.accent },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.mist },
  knobOn: { marginLeft: 18 },
  stat: { flex: 1, gap: 2 },
});
