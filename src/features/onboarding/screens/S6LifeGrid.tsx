import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing,
  useAnimatedReaction, runOnJS,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { GlassButton } from '@/components/glass/GlassButton';
import { haptics } from '@/lib/haptics';
import { useT, plural } from '@/i18n';
import { useSky } from '@/components/sky/SkyProvider';
import { useOnboardingStore } from '@/store/onboarding';
import { formatHours, formatLifeDuration } from '@/lib/format';
import { track } from '@/services';
import {
  ACTIVITIES, activityCount, friendEveningsPerWeek, lifeStats,
} from '../calculations';
import { LifeGrid } from '../scenes/LifeGrid';

export function S6LifeGrid({ onNext }: { onNext: () => void }) {
  const { d, t } = useT();
  const sky = useSky();
  const { width } = useWindowDimensions();
  const minutes = useOnboardingStore((s) => s.minutesPerDay);
  const age = useOnboardingStore((s) => s.age);
  const s = lifeStats(minutes, age);
  const [reclaimed, setReclaimed] = useState(false);

  const reveal = useSharedValue(0);
  const fill = useSharedValue(0);
  const reclaim = useSharedValue(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    sky.to('lifeGrid');
    // 0-1200 : vague diagonale. 1200-1450 : silence. 1450-3450 : allumage.
    reveal.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) });
    fill.value = withDelay(1450, withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }));
  }, [sky, reveal, fill]);

  // L'odometre suit exactement le remplissage : meme source, jamais d'ecart.
  useAnimatedReaction(
    () => Math.round(fill.value * s.lostMonths),
    (v, prev) => { if (v !== prev) runOnJS(setCount)(v); }
  );
  useAnimatedReaction(
    () => fill.value >= 1,
    (done, prev) => { if (done && !prev) runOnJS(haptics.stop)(); }
  );

  const gridH = Math.min(width * 1.05, 420);

  const takeBack = () => {
    setReclaimed(true);
    track('life_reclaimed');
    reclaim.value = withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }, (f) => {
      if (f) runOnJS(haptics.success)();
    });
    sky.set({ sunrise: 0.6, glowAmt: 0 });
  };

  const hoursYear = Math.round(s.hoursPerYear);
  const cards = [
    ...ACTIVITIES.map((a) => {
      const n = activityCount(s.hoursPerYear, a.costHours);
      const act = d.s6.activities[a.id as keyof typeof d.s6.activities];
      return { id: a.id, n: Math.floor(n), ratio: n, label: act, detail: act.detail };
    }),
    (() => {
      const n = friendEveningsPerWeek(s.hoursPerWeek);
      const act = d.s6.activities.friends;
      return { id: 'friends', n, ratio: n, label: act, detail: act.detail };
    })(),
  ];

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <View style={styles.pill}>
        <Text variant="label">
          {t(d.s6.pill, { h: formatHours(minutes), n: age })}
        </Text>
      </View>

      <Text variant="displayM" style={{ marginTop: space.lg }}>{d.s6.title}</Text>
      <Text variant="lead" tone="secondary">{d.s6.subtitle}</Text>

      <View style={{ height: gridH, marginTop: space.lg }}>
        <LifeGrid
          width={width - gutter * 2}
          height={gridH}
          lived={s.livedMonths}
          lost={s.lostMonths}
          total={s.totalMonths}
          reveal={reveal}
          fill={fill}
          reclaim={reclaim}
        />
      </View>

      <View style={styles.legend}>
        <Legend color={colors.dawn} label={d.s6.legendLived} />
        <Legend color={colors.screenGlow} label={d.s6.legendLost} />
        <Legend color={withAlpha(colors.mist, 0.4)} label={d.s6.legendAhead} />
      </View>

      <Text variant="hero" style={styles.big}>{formatLifeDuration(count)}</Text>
      <Text variant="body" tone="secondary">
        {t(d.s6.body, { p: Math.round(s.wakingShare * 100) })}
      </Text>

      {reclaimed && (
        <Animated.View entering={FadeIn.delay(1400).duration(400)}>
          <Text variant="title" style={{ marginTop: space.xl }}>
            {t(d.s6.afterTitle, { h: formatHours(hoursYear * 60) })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.md }}>
            {cards.map((c) => (
              <Glass key={c.id} radius={radii.tile} blur={false} style={styles.tile}>
                {c.n >= 1 ? (
                  <Text variant="displayL">{c.n}</Text>
                ) : (
                  <Text variant="displayM">{t(d.s6.progress, { p: Math.round(c.ratio * 100) })}</Text>
                )}
                <Text variant="body">{plural(c.n, c.label)}</Text>
                <Text variant="label" tone="secondary">{c.detail}</Text>
              </Glass>
            ))}
          </ScrollView>
          <Text variant="label" tone="tertiary" style={{ marginTop: space.md }}>
            {d.s6.estimates}
          </Text>
        </Animated.View>
      )}

      <View style={{ marginTop: space.xl }}>
        <GlassButton
          label={reclaimed ? d.s6.cta2 : d.s6.cta1}
          onPress={reclaimed ? onNext : takeBack}
        />
      </View>
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="label" tone="secondary">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.xxl },
  pill: {
    alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 6,
    borderRadius: radii.pill, backgroundColor: withAlpha(colors.mist, 0.08),
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  big: { fontSize: 46, lineHeight: 50, marginTop: space.lg },
  tile: { width: 190, padding: space.lg, marginRight: space.sm, gap: 4 },
});
