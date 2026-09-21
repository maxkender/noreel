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

const TOTAL = 9; // la progression reste a l'echelle des 9 ecrans du brief

function Flow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const persistStep = useOnboardingStore((s) => s.setStep);
  const complete = useOnboardingStore((s) => s.complete);
  const start = useOnboardingStore((s) => s.start);

  const go = useCallback((next: number) => {
    // Ecrans 5 a 9 pas encore construits : on termine proprement plutot que
    // d'afficher du vide.
    if (next > 3) {
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
