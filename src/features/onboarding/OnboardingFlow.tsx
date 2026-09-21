import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { ProgressContext } from '@/components/ProgressContext';
import { S1, S2, S3, S4, S5, S6, S7, S8, S9 } from './screens';
import { Permissions } from './screens/Permissions';
import { Paywall } from './screens/Paywall';

const TOTAL = 11;


export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
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
    <S8 key="8" onNext={() => go(8)} />,
    <S9 key="9" onNext={() => go(9)} />,
    <Permissions key="p" onDone={() => go(10)} />,
    <Paywall key="pw" onDone={finish} />,
  ];

  return (
    <View style={styles.root}>
      <ProgressContext.Provider value={bar}>
        {screens[step]}
      </ProgressContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  progress: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.accent },
});
