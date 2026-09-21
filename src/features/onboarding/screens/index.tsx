import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat,
  withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { space, radii } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT, plural } from '@/i18n';
import { useOnboardingStore, type PainFrequency } from '@/store/onboarding';
import { formatHours, formatLifeDuration } from '@/lib/format';
import { track } from '@/services';
import {
  ACTIVITIES, activityCount, friendEveningsPerWeek, lifeStats,
} from '../calculations';
import { LifeGrid } from '../scenes/LifeGrid';
import { DayArcDial } from '../scenes/DayArcDial';
import { AgeRuler } from '../scenes/AgeRuler';

type P = { onNext: () => void };

/* ---------- 1. Accueil ---------- */
export function S1({ onNext }: P) {
  const { d } = useT();
  const rise = useSharedValue(0);

  useEffect(() => {
    // Une seule animation : la marque se leve. Rien d'autre ne bouge.
    rise.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [rise]);

  const mark = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 24 }],
  }));

  return (
    <Screen cta={d.s1.cta} onPress={onNext}>
      <View style={s.hero}>
        <Animated.View style={[s.markWrap, mark]}>
          <View style={s.ring} />
          <View style={s.horizonLine} />
        </Animated.View>

        <Text variant="displayL" style={s.center}>{d.s1.title1}</Text>
        <Text variant="displayL" style={s.center}>{d.s1.title2}</Text>
        <Text variant="lead" tone="secondary" style={[s.center, { marginTop: space.md }]}>
          {d.s1.subtitle}
        </Text>
      </View>
    </Screen>
  );
}

/* ---------- 2. Ce que fait NoReel ---------- */
export function S2({ onNext }: P) {
  const { d } = useT();
  return (
    <Screen cta={d.s2.cta} onPress={onNext}>
      <Text variant="displayM">{d.s2.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>{d.s2.body}</Text>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        <Row keep label={d.s2.keep1} />
        <Row keep label={d.s2.keep2} />
        <Row label={d.s2.remove} />
      </View>
    </Screen>
  );
}

function Row({ label, keep }: { label: string; keep?: boolean }) {
  return (
    <View style={s.row}>
      <View style={[s.bullet, keep ? s.bulletKeep : s.bulletDrop]}>
        <Text variant="label" color={keep ? '#0B0D1F' : colors.mist}>{keep ? '✓' : '✕'}</Text>
      </View>
      <Text variant="body" tone={keep ? 'primary' : 'secondary'} style={{ flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

/* ---------- 3. Les excuses ---------- */
export function S3({ onNext }: P) {
  const { d } = useT();
  const setPain = useOnboardingStore((x) => x.setPainFrequency);
  const [answer, setAnswer] = useState<PainFrequency | null>(null);

  const options: [PainFrequency, string][] = [
    ['daily', d.s3.daily], ['weekly', d.s3.weekly], ['lostCount', d.s3.lostCount],
  ];

  return (
    <Screen cta={d.s3.cta} onPress={onNext} disabled={!answer}>
      <Text variant="label" tone="tertiary">01:47</Text>
      <Text variant="displayM" style={{ marginTop: space.sm }}>{d.s3.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>{d.s3.body}</Text>

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        {options.map(([key, label]) => {
          const on = answer === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setAnswer(key); setPain(key); haptics.tick();
                track('pain_answered', { answer: key });
              }}
              style={[s.option, on && s.optionOn]}
            >
              <Text variant="body" tone={on ? 'primary' : 'secondary'}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

/* ---------- 4. La solution ---------- */
export function S4({ onNext }: P) {
  const { d } = useT();
  return (
    <Screen cta={d.s4.cta} onPress={onNext}>
      <Text variant="displayM">{d.s4.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>{d.s4.body}</Text>

      <View style={s.compare}>
        <View style={[s.side, { borderColor: withAlpha(colors.screenGlow, 0.3) }]}>
          <Text variant="label" tone="secondary">{d.s4.before}</Text>
          {[0, 1, 2].map((i) => <View key={i} style={s.coldBar} />)}
        </View>
        <View style={[s.side, { borderColor: withAlpha(colors.sun, 0.4) }]}>
          <Text variant="label">{d.s4.after}</Text>
          <View style={s.warmBar} />
          <View style={[s.warmBar, { width: '60%' }]} />
        </View>
      </View>

      <Text variant="body" tone="secondary" style={{ marginTop: space.lg }}>{d.s4.note}</Text>
    </Screen>
  );
}

/* ---------- 5. Temps d'ecran + age ---------- */
export function S5({ onNext }: P) {
  const { d, t } = useT();
  const [phase, setPhase] = useState<'time' | 'age'>('time');
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const setMinutes = useOnboardingStore((x) => x.setMinutesPerDay);
  const age = useOnboardingStore((x) => x.age);
  const setAge = useOnboardingStore((x) => x.setAge);
  const st = lifeStats(minutes, age);

  if (phase === 'time') {
    return (
      <Screen
        cta={d.s5.ctaA}
        onPress={() => { track('screen_time_set', { minutes }); setPhase('age'); }}
      >
        <Text variant="displayM">{d.s5.titleA}</Text>
        <View style={s.dialWrap}>
          <DayArcDial minutes={minutes} onChange={setMinutes} />
        </View>
        <Text variant="hero" style={s.bigValue}>{formatHours(minutes)}</Text>
        <Text variant="body" tone="secondary" style={s.center}>{d.s5.unit}</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: space.lg }}>
          {t(d.s5.liveShare, { p: Math.round(st.wakingShare * 100) })}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen cta={d.s5.ctaB} onPress={() => { track('age_set', { age }); onNext(); }}>
      <Text variant="displayM">{d.s5.titleB}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.sm }}>{d.s5.bodyB}</Text>
      <Text variant="hero" style={s.bigValue}>{age}</Text>
      <AgeRuler age={age} onChange={setAge} />
    </Screen>
  );
}

/* ---------- 6. Ta vie en carreaux ---------- */
export function S6({ onNext }: P) {
  const { d, t } = useT();
  const { width } = useWindowDimensions();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const age = useOnboardingStore((x) => x.age);
  const st = lifeStats(minutes, age);
  const [taken, setTaken] = useState(false);

  const reveal = useSharedValue(0);
  const fill = useSharedValue(0);
  const reclaim = useSharedValue(0);

  useEffect(() => {
    reveal.value = withTiming(1, { duration: 700 });
    fill.value = withDelay(700, withTiming(1, { duration: 1200 }));
  }, [reveal, fill]);

  const gridW = width - 40;
  const gridH = Math.min(gridW * 0.95, 360);

  const take = () => {
    setTaken(true);
    track('life_reclaimed');
    haptics.success();
    reclaim.value = withTiming(1, { duration: 1200 });
  };

  return (
    <Screen
      cta={taken ? d.s6.cta2 : d.s6.cta1}
      onPress={taken ? onNext : take}
    >
      <Text variant="displayM">{d.s6.title}</Text>
      <Text variant="lead" tone="secondary">{d.s6.subtitle}</Text>

      <View style={{ height: gridH, marginTop: space.lg }}>
        <LifeGrid
          width={gridW} height={gridH}
          lived={st.livedMonths} lost={st.lostMonths} total={st.totalMonths}
          reveal={reveal} fill={fill} reclaim={reclaim}
        />
      </View>

      <Text variant="hero" style={s.bigValue}>{formatLifeDuration(st.lostMonths)}</Text>
      <Text variant="body" tone="secondary">
        {t(d.s6.body, { p: Math.round(st.wakingShare * 100) })}
      </Text>

      {taken && (
        <Animated.View entering={FadeIn.duration(400)} style={{ marginTop: space.xl }}>
          <Text variant="title">
            {t(d.s6.afterTitle, { h: formatHours(st.hoursPerYear * 60) })}
          </Text>
          <View style={{ marginTop: space.md, gap: space.sm }}>
            {ACTIVITIES.map((a) => {
              const n = Math.floor(activityCount(st.hoursPerYear, a.costHours));
              const act = d.s6.activities[a.id as keyof typeof d.s6.activities];
              return (
                <View key={a.id} style={s.activity}>
                  <Text variant="title" color={colors.accent}>{n}</Text>
                  <Text variant="body" tone="secondary" style={{ flex: 1 }}>
                    {plural(n, act)}
                  </Text>
                </View>
              );
            })}
            <View style={s.activity}>
              <Text variant="title" color={colors.accent}>
                {friendEveningsPerWeek(st.hoursPerWeek)}
              </Text>
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>
                {plural(friendEveningsPerWeek(st.hoursPerWeek), d.s6.activities.friends)}
              </Text>
            </View>
          </View>
          <Text variant="label" tone="tertiary" style={{ marginTop: space.md }}>
            {d.s6.estimates}
          </Text>
        </Animated.View>
      )}
    </Screen>
  );
}

/* ---------- 7. Le cerveau ---------- */
export function S7({ onNext }: P) {
  const { d } = useT();
  const [flip, setFlip] = useState<0 | 1 | null>(null);
  return (
    <Screen cta={d.s7.cta} onPress={onNext}>
      <Text variant="displayM">{d.s7.title}</Text>

      <Card
        title={d.s7.p1Title} number={d.s7.p1Number} body={d.s7.p1Body}
        back={d.s7.p1Back} flipped={flip === 0}
        onFlip={() => setFlip(flip === 0 ? null : 0)}
        source={d.s7.source} backLabel={d.s7.backFace}
      />
      <Card
        title={d.s7.p2Title} caption={d.s7.p2Definition} body={d.s7.p2Body}
        back={d.s7.p2Back} flipped={flip === 1}
        onFlip={() => setFlip(flip === 1 ? null : 1)}
        source={d.s7.source} backLabel={d.s7.backFace}
      />
    </Screen>
  );
}

function Card({
  title, number, caption, body, back, flipped, onFlip, source, backLabel,
}: {
  title: string; number?: string; caption?: string; body: string; back: string;
  flipped: boolean; onFlip: () => void; source: string; backLabel: string;
}) {
  return (
    <View style={s.card}>
      {flipped ? (
        <Text variant="body" tone="secondary">{back}</Text>
      ) : (
        <>
          {number && <Text variant="hero" style={s.cardNum}>{number}</Text>}
          <Text variant="title">{title}</Text>
          {caption && <Text variant="label" tone="tertiary">{caption}</Text>}
          <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>{body}</Text>
        </>
      )}
      <Pressable onPress={onFlip} hitSlop={8} style={{ marginTop: space.md }}>
        <Text variant="label" tone="tertiary">{flipped ? backLabel : source}</Text>
      </Pressable>
    </View>
  );
}

/* ---------- 8. L'amour ---------- */
export function S8({ onNext }: P) {
  const { d } = useT();
  const join = useSharedValue(0);

  useEffect(() => {
    join.value = withDelay(300, withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.2, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ), -1, false
    ));
  }, [join]);

  const l = useAnimatedStyle(() => ({ transform: [{ translateX: join.value * 70 }] }));
  const r = useAnimatedStyle(() => ({ transform: [{ translateX: -join.value * 70 }] }));

  return (
    <Screen cta={d.s8.cta} onPress={onNext}>
      <Text variant="displayM">{d.s8.title}</Text>

      <View style={s.lights}>
        <View style={s.lightLine} />
        <Animated.View style={[s.light, { left: 0 }, l]} />
        <Animated.View style={[s.light, { right: 0 }, r]} />
      </View>

      {[d.s8.l1, d.s8.l2, d.s8.l3].map((line, i) => (
        <Text key={i} variant="body" tone="secondary" style={{ marginTop: space.md }}>
          {line}
        </Text>
      ))}
      <Text variant="title" style={{ marginTop: space.xl }}>{d.s8.conclusion}</Text>
    </Screen>
  );
}

/* ---------- 9. Ecran d'accueil ---------- */
export function S9({ onNext }: P) {
  const { d } = useT();
  return (
    <Screen cta={d.s9.cta} onPress={onNext} secondary={d.s9.later} onSecondary={onNext}>
      <Text variant="displayM">{d.s9.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>{d.s9.body}</Text>

      <View style={s.appsRow}>
        {[d.s9.appInsta, d.s9.appTiktok].map((n) => (
          <View key={n} style={s.appTile}>
            <View style={s.appIcon}><View style={s.appRing} /></View>
            <Text variant="label">{n}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        <Step n="1" label={d.s9.step1} />
        <Step n="2" label={d.s9.step2} />
      </View>
    </Screen>
  );
}

function Step({ n, label }: { n: string; label: string }) {
  return (
    <View style={s.row}>
      <View style={s.stepNum}><Text variant="label">{n}</Text></View>
      <Text variant="body" tone="secondary" style={{ flex: 1 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: space.xxl },
  markWrap: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl },
  ring: { width: 64, height: 64, borderRadius: 32, borderWidth: 5, borderColor: colors.mist },
  horizonLine: {
    position: 'absolute', bottom: 18, width: 88, height: 2,
    borderRadius: 1, backgroundColor: colors.accent,
  },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bullet: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  bulletKeep: { backgroundColor: colors.mist },
  bulletDrop: { backgroundColor: colors.surfaceHi, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong },
  option: {
    paddingHorizontal: space.lg, paddingVertical: space.lg, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.1) },
  compare: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  side: {
    flex: 1, padding: space.md, borderRadius: 14, gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth, backgroundColor: colors.surface,
  },
  coldBar: { height: 20, borderRadius: 4, backgroundColor: withAlpha(colors.accent, 0.35) },
  warmBar: { height: 20, borderRadius: 4, backgroundColor: withAlpha(colors.mist, 0.22) },
  dialWrap: { alignItems: 'center', marginTop: space.xl },
  bigValue: { textAlign: 'center', marginTop: space.lg },
  activity: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
  card: {
    marginTop: space.lg, padding: space.lg, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardNum: { marginBottom: space.sm },
  lights: { height: 80, marginTop: space.xl, justifyContent: 'center' },
  lightLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  light: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  appsRow: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  appTile: { alignItems: 'center', gap: space.sm },
  appIcon: {
    width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  appRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: colors.mist },
  stepNum: {
    width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
  },
});
