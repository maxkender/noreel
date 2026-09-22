import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SlideInRight, SlideOutLeft, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { ProgressContext } from '@/components/ProgressContext';
import { Intro } from '@/components/Intro';
import { S1, S2, S3, S4, S5, S6, S7, S9 } from './screens';
import { Permissions } from './screens/Permissions';
import { Paywall } from './screens/Paywall';

const TOTAL = 10;


export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [intro, setIntro] = useState(true);
  const persist = useOnboardingStore((s) => s.setStep);
  const complete = useOnboardingStore((s) => s.complete);
  const start = useOnboardingStore((s) => s.start);

  useEffect(() => { start(); track('onboarding_started'); }, [start]);

  const finish = useCallback(() => {
    complete();
    track('onboarding_completed');
    router.replace('/home');
  }, [complete, router]);

  const go = useCallback((next: number) => {
    if (next >= TOTAL) { finish(); return; }
    setStep(next);
    persist(next);
    track('step_viewed', { step: next });
  }, [finish, persist]);

  const bar = step > 0 ? (
    <View style={styles.progress}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />
      ))}
    </View>
  ) : undefined;

  const screens = [
    <S1 key="1" onNext={() => go(1)} />,
    <S2 key="2" onNext={() => go(2)} />,
    <S3 key="3" onNext={() => go(3)} />,
    <S4 key="4" onNext={() => go(4)} />,
    <S5 key="5" onNext={() => go(5)} />,
    <S6 key="6" onNext={() => go(6)} />,
    <S7 key="7" onNext={() => go(7)} />,
    <S9 key="8" onNext={() => go(8)} />,
    <Permissions key="p" onDone={() => go(9)} />,
    <Paywall key="pw" onDone={finish} />,
  ];

  return (
    <View style={styles.root}>
      <ProgressContext.Provider value={bar}>
        {/* Glissement lateral entre ecrans : on sent la progression. */}
        <Animated.View
          key={step}
          entering={SlideInRight.springify().damping(22).stiffness(140)}
          exiting={SlideOutLeft.duration(220)}
          style={StyleSheet.absoluteFill}
        >
          {screens[step]}
        </Animated.View>
      </ProgressContext.Provider>

      {intro && <Intro onDone={() => setIntro(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  progress: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.accent },
});
