import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { SelectCard } from '@/components/SelectCard';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useOnboardingStore, type PainFrequency } from '@/store/onboarding';
import { formatHours } from '@/lib/format';
import { track } from '@/services';
import { screenYears, wakingShare } from '../calculations';
import { TimeSlider } from '../scenes/TimeSlider';
import { AgeInput } from '../scenes/AgeInput';

const MARK = require('@/assets/brand/mark.png');

type P = { onNext: () => void };

/* ---------- 1 ---------- */
export function S1({ onNext }: P) {
  const { d } = useT();
  return (
    <Screen cta={d.tapHint} onPress={onNext} center tapToContinue hintDelay={4400} hue="accent">
      <Image source={MARK} style={s.mark} contentFit="contain" />
      <Typewriter text={d.s1.title1} variant="displayL" speed={46} style={s.center} />
      {true && (
        <Typewriter text={d.s1.title2} variant="displayL" speed={46} delay={900} style={s.center} />
      )}
      {true && (
        <Animated.View entering={FadeIn.duration(500)}>
          <Text variant="lead" tone="secondary" style={[s.center, { marginTop: space.lg }]}>
            {d.s1.subtitle}
          </Text>
        </Animated.View>
      )}
    </Screen>
  );
}

/* ---------- 2 ---------- */
export function S2({ onNext }: P) {
  const { d } = useT();
  return (
    <Screen cta={d.s2.cta} onPress={onNext} center hue="deep">
      <Typewriter text={d.s2.title} variant="displayM" style={s.center} />
      {true && (
        <Animated.View entering={FadeIn.duration(500)} style={{ marginTop: space.xxl, gap: space.md }}>
          <Keep label={d.s2.keep1} keep />
          <Keep label={d.s2.keep2} keep />
          <Keep label={d.s2.remove} />
        </Animated.View>
      )}
    </Screen>
  );
}

function Keep({ label, keep }: { label: string; keep?: boolean }) {
  return (
    <View style={s.keepRow}>
      <Text variant="title" color={keep ? colors.accent : withAlpha(colors.mist, 0.25)}>
        {keep ? '✓' : '✕'}
      </Text>
      <Text variant="body" tone={keep ? 'primary' : 'tertiary'} style={{ flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

/* ---------- 3 ---------- */
export function S3({ onNext }: P) {
  const { d } = useT();
  const setPain = useOnboardingStore((x) => x.setPainFrequency);
  const [a, setA] = useState<PainFrequency | null>(null);

  const opts: [PainFrequency, string, string][] = [
    ['daily', '🌙', d.s3.daily],
    ['weekly', '🔁', d.s3.weekly],
    ['lostCount', '🫠', d.s3.lostCount],
  ];

  return (
    <Screen cta={d.s3.cta} onPress={onNext} disabled={!a} hue="warm">
      <Typewriter text={d.s3.title} variant="displayM" />
      {true && (
        <Animated.View entering={FadeIn.duration(500)} style={{ marginTop: space.xxl, gap: space.md }}>
          {opts.map(([k, icon, label]) => (
            <SelectCard
              key={k}
              label={label}
              lead={<Text variant="title">{icon}</Text>}
              selected={a === k}
              onPress={() => { setA(k); setPain(k); track('pain_answered', { answer: k }); }}
            />
          ))}
        </Animated.View>
      )}
    </Screen>
  );
}

/* ---------- 4 ---------- */
export function S4({ onNext }: P) {
  const { d } = useT();
  return (
    <Screen cta={d.tapHint} onPress={onNext} center tapToContinue hintDelay={3600} hue="deep">
      <Typewriter text={d.s4.title} variant="displayM" speed={40} style={s.center} />
      {/* TODO produit : enregistrement d'ecran de l'app a la place de ce cadre. */}
      <Animated.View entering={FadeIn.delay(1200).duration(600)} style={s.videoSlot}>
        <View style={s.videoInner} />
      </Animated.View>
    </Screen>
  );
}

/* ---------- 5 ---------- */
export function S5({ onNext }: P) {
  const { d, t } = useT();
  const [phase, setPhase] = useState<'time' | 'age'>('time');
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const setMinutes = useOnboardingStore((x) => x.setMinutesPerDay);
  const age = useOnboardingStore((x) => x.age);
  const setAge = useOnboardingStore((x) => x.setAge);

  if (phase === 'time') {
    return (
      <Screen cta={d.s5.ctaA} onPress={() => { track('screen_time_set', { minutes }); setPhase('age'); }} center hue="accent">
        <Typewriter text={d.s5.titleA} variant="displayM" style={s.center} />
        <Text variant="hero" style={[s.center, s.value]} numberOfLines={1} adjustsFontSizeToFit>
          {formatHours(minutes)}
        </Text>
        <View style={s.sliderWrap}>
          <TimeSlider minutes={minutes} onChange={setMinutes} />
        </View>
        <Text variant="body" tone="secondary" style={s.center}>
          {t(d.s5.liveShare, { p: Math.round(wakingShare(minutes) * 100) })}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen cta={d.s5.ctaB} onPress={() => { track('age_set', { age }); onNext(); }} center hue="warm">
      <Typewriter text={d.s5.titleB} variant="displayM" style={s.center} />
      <View style={s.ageWrap}>
        <AgeInput age={age} onChange={setAge} />
      </View>
    </Screen>
  );
}

/* ---------- 6 ---------- */
export function S6({ onNext }: P) {
  const { d, t } = useT();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const target = Math.round(wakingShare(minutes) * 100);
  const years = screenYears(minutes);
  const [lit, setLit] = useState(0);

  // 88 ms par case : assez lent pour qu'on voie la part grandir et que ca pese.
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setLit(i);
      if (i % 10 === 0) haptics.tick();
      if (i >= target) clearInterval(id);
    }, 88);
    return () => clearInterval(id);
  }, [target]);

  const done = lit >= target;

  return (
    <Screen cta={d.s6.cta2} onPress={onNext} center disabled={!done} hue="danger">
      <Typewriter text={d.s6.title} variant="displayM" style={s.center} />

      <View style={s.hundredWrap}>
        <View style={s.hundred}>
          {Array.from({ length: 100 }, (_, i) => (
            <Cell key={i} on={i < lit} index={i} />
          ))}
        </View>
      </View>

      <Text variant="hero" style={[s.center, s.pct]} numberOfLines={1} adjustsFontSizeToFit>
        {lit} %
      </Text>

      {done && (
        <Animated.View entering={FadeIn.duration(900)}>
          <Text variant="body" tone="secondary" style={s.center}>
            {t(d.s6.body, { y: Math.round(years) })}
          </Text>
        </Animated.View>
      )}
    </Screen>
  );
}

/** Chaque case s'allume en fondu : le remplissage devient une vague, pas un saut. */
function Cell({ on, index }: { on: boolean; index: number }) {
  return on ? (
    <Animated.View
      entering={FadeIn.duration(420)}
      style={[s.square, { backgroundColor: colors.danger }]}
    />
  ) : (
    <View key={index} style={[s.square, s.squareOff]} />
  );
}

/* ---------- 7 ---------- */
export function S7({ onNext }: P) {
  const { d } = useT();
  const [i, setI] = useState(0);

  const steps = [
    [d.brain.intro, d.brain.introSub],
    [d.brain.step1, d.brain.step1b],
    [d.brain.step2, d.brain.step2b],
    [d.brain.step3, d.brain.step3b],
    [d.brain.fix, ''],
  ];
  const last = i >= steps.length - 1;
  // Le rouge monte a chaque symptome, puis retombe quand arrive la sortie.
  const harm = last ? 0 : i / (steps.length - 1);

  return (
    <Screen
      cta={d.tapHint}
      onPress={() => (last ? onNext() : setI((n) => n + 1))}
      tapToContinue
      hintDelay={2400}
      center
      hue="danger"
    >
      <Harm level={harm} on={last} />

      {/* La trace de ce qui precede reste visible, en petit et en rouge :
          une seule ligne de temps, celle du haut de l'ecran. */}
      <View style={s.trace}>
        {steps.slice(0, i).map(([t], k) => (
          <Animated.View key={t} entering={FadeIn.duration(400)}>
            <Text
              variant="label"
              color={withAlpha(last ? colors.accent : colors.danger, 0.3 + k * 0.12)}
              numberOfLines={1}
            >
              {t}
            </Text>
          </Animated.View>
        ))}
      </View>

      <Animated.View key={i} entering={FadeIn.duration(500)}>
        <Typewriter
          text={steps[i][0]}
          variant={last ? 'displayM' : 'displayL'}
          speed={42}
          style={s.center}
        />
        {steps[i][1] ? (
          <Animated.View entering={FadeIn.delay(900).duration(500)}>
            <Text variant="lead" tone="secondary" style={[s.center, { marginTop: space.lg }]}>
              {steps[i][1]}
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

/** Halo rouge qui grandit avec les degats, et vire a l'accent a la fin. */
function Harm({ level, on }: { level: number; on: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(on ? 0 : level, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [level, on, t]);

  const style = useAnimatedStyle(() => ({ opacity: t.value }));

  return (
    <Animated.View style={[s.harm, style]} pointerEvents="none">
      <LinearGradient
        colors={[withAlpha(colors.danger, 0.34), withAlpha(colors.danger, 0.08), 'transparent']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  videoSlot: {
    marginTop: space.xxl, height: 300, borderRadius: 26, padding: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  videoInner: { flex: 1, borderRadius: 20, backgroundColor: colors.surfaceHi },
  hundredWrap: { alignItems: 'center', marginVertical: space.xl },
  hundred: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 5,
    width: 250,
  },
  square: { width: 20.5, height: 20.5, borderRadius: 4 },
  pct: { marginTop: 0, marginBottom: space.sm },
  squareOff: { backgroundColor: withAlpha(colors.mist, 0.07) },
  chain: { flexDirection: 'row', gap: space.md },
  chainCol: { alignItems: 'center', width: 12 },
  chainDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6 },
  chainLine: { flex: 1, width: 1, backgroundColor: withAlpha(colors.accent, 0.3) },
  center: { textAlign: 'center' },
  trace: { alignItems: 'center', gap: 2, marginBottom: space.xl, minHeight: 60 },
  harm: { position: 'absolute', top: -200, left: -60, right: -60, height: 460 },
  mark: { alignSelf: 'center', width: 96, height: 96, marginBottom: space.xl },
  value: { marginVertical: space.lg, alignSelf: 'stretch', textAlign: 'center' },
  sliderWrap: { alignItems: 'center', marginBottom: space.lg },
  ageWrap: { marginTop: space.xxl, alignItems: 'center' },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  compare: { flexDirection: 'row', gap: space.md, marginTop: space.xxl },
  col: { flex: 1, gap: space.sm },
  colBarCold: { height: 18, borderRadius: 4, backgroundColor: withAlpha(colors.mist, 0.08) },
  colBarWarm: { height: 18, borderRadius: 4, backgroundColor: withAlpha(colors.accent, 0.35) },
  activity: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
  apps: { flexDirection: 'row', gap: space.xl, justifyContent: 'center', marginTop: space.xxl },
  app: { alignItems: 'center', gap: space.sm },
  appIcon: {
    width: 62, height: 62, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  appRing: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: colors.mist },
});
