import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter, typeDuration } from '@/components/type/Typewriter';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useOnboardingStore, type PainFrequency } from '@/store/onboarding';
import { formatHours } from '@/lib/format';
import { track } from '@/services';
import { screenYears, wakingShare } from '../calculations';
import { TimeSlider } from '../scenes/TimeSlider';
import { AgeRuler } from '../scenes/AgeRuler';

type P = { onNext: () => void };

/** Liste d'options : pilule sombre, point d'accent quand choisie. */
function Option({
  label, icon, selected, onPress,
}: { label: string; icon?: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => { haptics.tick(); onPress(); }}
      style={[s.option, selected && s.optionOn]}
    >
      {icon && <Text variant="title" style={s.optionIcon}>{icon}</Text>}
      <Text variant="body" tone={selected ? 'primary' : 'secondary'} style={{ flex: 1 }}>
        {label}
      </Text>
      <View style={[s.dot, selected && s.dotOn]} />
    </Pressable>
  );
}

/* ---------- 1 ---------- */
export function S1({ onNext }: P) {
  const { d } = useT();
  return (
    <Screen cta={d.tapHint} onPress={onNext} center tapToContinue hintDelay={3200}>
      <View style={s.mark}>
        <View style={s.ring} />
        <View style={s.bar} />
      </View>
      <Typewriter text={d.s1.title1} variant="displayL" style={s.center} />
      {true && (
        <Typewriter text={d.s1.title2} variant="displayL" style={s.center} />
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
    <Screen cta={d.s2.cta} onPress={onNext} center>
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
    <Screen cta={d.s3.cta} onPress={onNext} disabled={!a}>
      <Typewriter text={d.s3.title} variant="displayM" />
      {true && (
        <Animated.View entering={FadeIn.duration(500)} style={{ marginTop: space.xxl, gap: space.sm }}>
          {opts.map(([k, icon, label]) => (
            <Option
              key={k} icon={icon} label={label} selected={a === k}
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
    <Screen cta={d.tapHint} onPress={onNext} center tapToContinue hintDelay={2600}>
      <Typewriter text={d.s4.title} variant="displayM" style={s.center} />
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
      <Screen cta={d.s5.ctaA} onPress={() => { track('screen_time_set', { minutes }); setPhase('age'); }} center>
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
    <Screen cta={d.s5.ctaB} onPress={() => { track('age_set', { age }); onNext(); }} center>
      <Typewriter text={d.s5.titleB} variant="displayM" style={s.center} />
      <Text variant="hero" style={[s.center, s.value]} numberOfLines={1} adjustsFontSizeToFit>
        {age}
      </Text>
      <AgeRuler age={age} onChange={setAge} />
    </Screen>
  );
}

/* ---------- 6 ---------- */
export function S6({ onNext }: P) {
  const { d, t } = useT();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const share = wakingShare(minutes);
  const years = screenYears(minutes);
  const target = Math.round(share * 100);
  const [lit, setLit] = useState(0);

  // Remplissage visible : un carre tous les 26 ms, on voit la part monter.
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setLit(i);
      if (i >= target) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
  }, [target]);

  return (
    <Screen cta={d.s6.cta2} onPress={onNext}>
      <Typewriter text={d.s6.title} variant="displayM" />

      <View style={s.hundred}>
        {Array.from({ length: 100 }, (_, i) => (
          <View
            key={i}
            style={[s.square, i < lit ? s.squareOn : s.squareOff]}
          />
        ))}
      </View>

      <Text variant="hero" style={s.value} numberOfLines={1} adjustsFontSizeToFit>
        {lit} %
      </Text>
      <Text variant="body" tone="secondary">
        {t(d.s6.body, { y: Math.round(years) })}
      </Text>
    </Screen>
  );
}

/* ---------- 7 ---------- */
export function S7({ onNext }: P) {
  const { d } = useT();
  const steps = [
    [d.brain.step1, d.brain.step1b],
    [d.brain.step2, d.brain.step2b],
    [d.brain.step3, d.brain.step3b],
  ];
  const head = typeDuration(d.brain.title);

  return (
    <Screen cta={d.tapHint} onPress={onNext} tapToContinue hintDelay={4200}>
      <Typewriter text={d.brain.title} variant="displayM" />

      <View style={{ marginTop: space.xxl }}>
        {steps.map(([title, body], i) => (
          <Animated.View
            key={title}
            entering={FadeIn.delay(head + i * 450).duration(500)}
            style={s.chain}
          >
            <View style={s.chainCol}>
              <View style={s.chainDot} />
              {i < steps.length - 1 && <View style={s.chainLine} />}
            </View>
            <View style={{ flex: 1, paddingBottom: space.xl }}>
              <Text variant="title">{title}</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>{body}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeIn.delay(head + 1600).duration(600)}>
        <Text variant="lead" color={colors.accent}>{d.brain.fix}</Text>
      </Animated.View>
    </Screen>
  );
}

/* ---------- 9 ---------- */
export function S9({ onNext }: P) {
  const { d } = useT();
  return (
    <Screen cta={d.s9.cta} onPress={onNext} secondary={d.s9.later} onSecondary={onNext} center>
      <Typewriter text={d.s9.title} variant="displayM" style={s.center} />
      <Animated.View entering={FadeIn.delay(1600).duration(600)} style={s.apps}>
        {[d.s9.appInsta, d.s9.appTiktok].map((n) => (
          <View key={n} style={s.app}>
            <View style={s.appIcon}><View style={s.appRing} /></View>
            <Text variant="label" tone="secondary">{n}</Text>
          </View>
        ))}
      </Animated.View>
    </Screen>
  );
}

const s = StyleSheet.create({
  videoSlot: {
    marginTop: space.xxl, height: 300, borderRadius: 26, padding: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  videoInner: { flex: 1, borderRadius: 20, backgroundColor: colors.surfaceHi },
  hundred: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginTop: space.xl, marginBottom: space.lg,
  },
  square: { width: '8%', aspectRatio: 1, borderRadius: 3 },
  squareOn: { backgroundColor: colors.accent },
  squareOff: { backgroundColor: withAlpha(colors.mist, 0.07) },
  chain: { flexDirection: 'row', gap: space.md },
  chainCol: { alignItems: 'center', width: 12 },
  chainDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6 },
  chainLine: { flex: 1, width: 1, backgroundColor: withAlpha(colors.accent, 0.3) },
  center: { textAlign: 'center' },
  mark: { alignItems: 'center', justifyContent: 'center', height: 90, marginBottom: space.xl },
  ring: { width: 58, height: 58, borderRadius: 29, borderWidth: 5, borderColor: colors.mist },
  bar: { position: 'absolute', bottom: 22, width: 88, height: 2, backgroundColor: colors.accent },
  value: { marginVertical: space.lg, alignSelf: 'stretch', textAlign: 'center' },
  sliderWrap: { alignItems: 'center', marginBottom: space.lg },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: 18, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.08) },
  optionIcon: { width: 26 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: withAlpha(colors.mist, 0.25),
  },
  dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
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
