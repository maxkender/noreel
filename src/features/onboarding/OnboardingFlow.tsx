import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { SkyProvider } from '@/components/sky/SkyProvider';
import { SkyBackground } from '@/components/sky/SkyBackground';
import { useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { HorizonProgress } from './chrome/HorizonProgress';
import { BackButton } from './chrome/BackButton';
import { S1Welcome } from './screens/S1Welcome';
import { S2Explain } from './screens/S2Explain';
import { S3Pain } from './screens/S3Pain';
import { S4Solution } from './screens/S4Solution';
import { S5Input } from './screens/S5Input';
import { S6LifeGrid } from './screens/S6LifeGrid';
import { S7Harms } from './screens/S7Harms';
import { S8Love } from './screens/S8Love';
import { S9HomeApps } from './screens/S9HomeApps';
import { Permissions } from './screens/Permissions';
import { Paywall } from './screens/Paywall';

const TOTAL = 11; // 9 ecrans + permissions + paywall

function Flow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const persistStep = useOnboardingStore((s) => s.setStep);
  const complete = useOnboardingStore((s) => s.complete);
  const start = useOnboardingStore((s) => s.start);

  const go = useCallback((next: number) => {
    if (next >= TOTAL) {
      complete();
      track('onboarding_completed');
      router.replace('/home');
      return;
    }
    setStep(next);
    persistStep(next);
    track('step_viewed', { step: next });
  }, [complete, persistStep, router]);

  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  useEffect(() => { start(); track('onboarding_started'); }, [start]);

  const screens = [
    <S1Welcome key="s1" onNext={() => go(1)} />,
    <S2Explain key="s2" onNext={() => go(2)} />,
    <S3Pain key="s3" onNext={() => go(3)} />,
    <S4Solution key="s4" onNext={() => go(4)} />,
    <S5Input key="s5" onNext={() => go(5)} />,
    <S6LifeGrid key="s6" onNext={() => go(6)} />,
    <S7Harms key="s7" onNext={() => go(7)} />,
    <S8Love key="s8" onNext={() => go(8)} />,
    <S9HomeApps key="s9" onNext={() => go(9)} />,
    <Permissions key="perm" onDone={() => go(10)} />,
    // Le paywall ne bloque jamais : ses deux boutons menent a la Home.
    <Paywall key="pay" onDone={() => go(TOTAL)} />,
  ];

  return (
    <View style={styles.root}>
      {/* Le ciel ne se demonte jamais : c'est lui la continuite (§5.2). */}
      <SkyBackground />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {step > 0 && (
          <Animated.View entering={FadeIn.duration(280)} style={styles.chrome}>
            <BackButton onPress={back} />
            <View style={styles.progress}>
              <HorizonProgress step={step} total={TOTAL} />
            </View>
          </Animated.View>
        )}

        <Animated.View
          key={step}
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(220)}
          style={styles.screen}
        >
          {screens[step]}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

export function OnboardingFlow() {
  return (
    <SkyProvider initial="introChaos">
      <Flow />
    </SkyProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  safe: { flex: 1 },
  chrome: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: gutter, paddingTop: space.sm,
  },
  progress: { flex: 1 },
  screen: { flex: 1 },
});
