import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { presetForHour } from '@/theme/sky-presets';
import { SkyProvider, useSky } from '@/components/sky/SkyProvider';
import { SkyBackground } from '@/components/sky/SkyBackground';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { formatHours, formatLifeDuration, locale } from '@/lib/format';
import { filteredApps, shield, stats } from '@/services';

function Body() {
  const { d, t } = useT();
  const sky = useSky();
  const { width } = useWindowDimensions();
  const [today, setToday] = useState({ reclaimedMinutes: 0, goalMinutes: 120 });
  const [week, setWeek] = useState<number[]>([]);
  const [year, setYear] = useState<number[]>([]);
  const [reels, setReels] = useState(0);
  const [streak, setStreak] = useState(0);
  const [on, setOn] = useState(true);

  // Le ciel suit l'heure reelle, recalcule chaque minute (§8).
  useEffect(() => {
    const apply = () => sky.to(presetForHour(new Date().getHours()), { duration: 1200 });
    apply();
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, [sky]);

  useEffect(() => {
    void stats.today().then(setToday);
    void stats.week().then(setWeek);
    void stats.year().then(setYear);
    void stats.reelsAvoidedThisWeek().then(setReels);
    void stats.streakDays().then(setStreak);
    void shield.isActive().then(setOn);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 18 ? d.home.morning : d.home.evening;
  const date = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());

  const ratio = today.goalMinutes > 0 ? Math.min(1, today.reclaimedMinutes / today.goalMinutes) : 0;
  const dayOne = today.reclaimedMinutes === 0;
  const yearTotal = year.reduce((a, b) => a + b, 0);
  const pages = Math.round((today.reclaimedMinutes * 238) / 275);

  const cellW = (width - gutter * 2 - space.sm) / 2;

  return (
    <View style={styles.root}>
      <SkyBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(320)}>
            <Text variant="displayM">{greeting}</Text>
            <Text variant="body" tone="secondary">{date}</Text>
          </Animated.View>

          {/* Heros : un mini-horizon dont le soleil monte avec la progression */}
          <Animated.View entering={FadeIn.delay(80).duration(320)}>
            <Glass style={styles.hero}>
              {dayOne ? (
                <Text variant="body" tone="secondary">{d.home.dayOne}</Text>
              ) : (
                <>
                  <Text variant="hero" style={styles.heroNum}>
                    {formatHours(today.reclaimedMinutes)}
                  </Text>
                  <Text variant="body" tone="secondary">{d.home.reclaimedToday}</Text>
                </>
              )}

              <View style={styles.miniSky}>
                <View style={styles.miniHorizon} />
                <View style={[styles.miniSun, { bottom: 10 + ratio * 46 }]} />
              </View>

              <Text variant="label" tone="tertiary">
                {t(d.home.goal, { h: formatHours(today.goalMinutes) })}
              </Text>

              <Text variant="label" tone="secondary" style={{ marginTop: space.md }}>
                {d.home.yourWeek}
              </Text>
              <View style={styles.weekRow}>
                {week.map((m, i) => (
                  <View
                    key={i}
                    style={[
                      styles.weekSun,
                      { opacity: 0.2 + Math.min(1, m / 150) * 0.8 },
                      i === week.length - 1 && styles.weekToday,
                    ]}
                  />
                ))}
              </View>
            </Glass>
          </Animated.View>

          {/* Tuiles de lancement */}
          <Animated.View entering={FadeIn.delay(160).duration(320)} style={styles.tiles}>
            {([
              ['instagram', d.s9.appInsta, d.home.instaSub],
              ['tiktok', d.s9.appTiktok, d.home.tiktokSub],
            ] as const).map(([app, name, sub]) => (
              <Pressable
                key={app}
                style={{ width: cellW }}
                onPress={() => { haptics.press(); void filteredApps.open(app); }}
              >
                <Glass radius={radii.tile} style={styles.tile}>
                  <View style={styles.tileIcon}><View style={styles.tileRing} /></View>
                  <Text variant="body">{name}</Text>
                  <Text variant="label" tone="secondary">{sub}</Text>
                </Glass>
              </Pressable>
            ))}
          </Animated.View>

          {/* Protection */}
          <Animated.View entering={FadeIn.delay(240).duration(320)}>
            <Pressable onPress={() => { haptics.tap(); setOn((v) => !v); void shield.setActive(!on); }}>
              <Glass style={[styles.shield, on && styles.shieldOn]}>
                <Text variant="body" style={{ flex: 1 }}>
                  {on ? d.home.shieldOn : d.home.shieldOff}
                </Text>
                <View style={[styles.switch, on && styles.switchOn]}>
                  <View style={[styles.knob, on && styles.knobOn]} />
                </View>
              </Glass>
            </Pressable>
          </Animated.View>

          {/* Chiffres */}
          <Animated.View entering={FadeIn.delay(320).duration(320)} style={styles.tiles}>
            <Glass radius={radii.tile} style={[styles.stat, { width: cellW }]}>
              <Text variant="displayM">{dayOne ? '—' : reels}</Text>
              <Text variant="label" tone="secondary">{d.home.reelsAvoided}</Text>
            </Glass>
            <Glass radius={radii.tile} style={[styles.stat, { width: cellW }]}>
              <Text variant="displayM">{dayOne ? '—' : streak}</Text>
              <Text variant="label" tone="secondary">{d.home.streak}</Text>
            </Glass>
          </Animated.View>

          {/* L'annee en 365 carreaux */}
          <Animated.View entering={FadeIn.delay(400).duration(320)}>
            <Glass style={styles.year}>
              <Text variant="title">{d.home.yearTitle}</Text>
              <View style={styles.yearGrid}>
                {year.map((m, i) => (
                  <View
                    key={i}
                    style={[
                      styles.yearCell,
                      m > 0
                        ? { backgroundColor: withAlpha(colors.sun, 0.25 + Math.min(1, m / 150) * 0.7) }
                        : { backgroundColor: withAlpha(colors.mist, 0.08) },
                    ]}
                  />
                ))}
              </View>
              <Text variant="label" tone="secondary" style={{ marginTop: space.sm }}>
                {t(d.home.yearBody, { duration: formatHours(yearTotal) })}
              </Text>
            </Glass>
          </Animated.View>

          {/* Idee du jour */}
          {!dayOne && (
            <Animated.View entering={FadeIn.delay(480).duration(320)}>
              <Glass style={styles.idea}>
                <Text variant="body">
                  {t(d.home.idea, { h: formatHours(today.reclaimedMinutes), n: pages })}
                </Text>
              </Glass>
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.tabBar}>
          <Glass radius={radii.pill} style={styles.tabs}>
            {[d.home.tabHome, d.home.tabStats, d.home.tabSettings].map((label, i) => (
              <View key={label} style={[styles.tab, i === 0 && styles.tabOn]}>
                <Text variant="label" tone={i === 0 ? 'primary' : 'secondary'}>{label}</Text>
              </View>
            ))}
          </Glass>
        </View>
      </SafeAreaView>
    </View>
  );
}

export function HomeScreen() {
  return (
    <SkyProvider initial={presetForHour(new Date().getHours())}>
      <Body />
    </SkyProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  scroll: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: 110, gap: space.md },
  hero: { padding: space.lg, gap: 4 },
  heroNum: { fontSize: 48, lineHeight: 52 },
  miniSky: { height: 64, marginVertical: space.md, justifyContent: 'flex-end' },
  miniHorizon: { height: 1, backgroundColor: withAlpha(colors.mist, 0.3), marginBottom: 10 },
  miniSun: {
    position: 'absolute', alignSelf: 'center',
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sun,
    shadowColor: colors.sun, shadowOpacity: 0.8, shadowRadius: 12,
  },
  weekRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  weekSun: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.sun },
  weekToday: { borderWidth: 1.5, borderColor: colors.mist },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { padding: space.lg, gap: 4, minHeight: 118 },
  tileIcon: {
    width: 30, height: 30, borderRadius: 9, marginBottom: space.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.sun, 0.2),
  },
  tileRing: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.sun },
  shield: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  shieldOn: { borderColor: withAlpha(colors.sun, 0.35) },
  switch: {
    width: 44, height: 26, borderRadius: 13, padding: 3,
    backgroundColor: withAlpha(colors.mist, 0.14),
  },
  switchOn: { backgroundColor: withAlpha(colors.sun, 0.5) },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.mist },
  knobOn: { marginLeft: 18 },
  stat: { padding: space.lg, gap: 2 },
  year: { padding: space.lg },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: space.md },
  yearCell: { width: 6, height: 6, borderRadius: 1.5 },
  idea: { padding: space.lg },
  tabBar: { position: 'absolute', left: gutter, right: gutter, bottom: space.lg },
  tabs: { flexDirection: 'row', padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: space.md, borderRadius: radii.pill },
  tabOn: { backgroundColor: withAlpha(colors.mist, 0.12) },
});
