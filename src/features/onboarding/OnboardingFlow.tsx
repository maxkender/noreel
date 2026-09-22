import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { ProgressContext } from '@/components/ProgressContext';
import { Intro } from '@/components/Intro';
import { StepBoundary } from '@/components/StepBoundary';
import { S1, S3, S4, S5, S6, S6Years, S7 } from './screens';
import {
  Constat, Distractions, Essentials, Name, NotificationsAsk, PromiseScreen,
  RulesIntro, RulesPick,
} from './screens/setup';
import { Permissions } from './screens/Permissions';
import { Paywall } from './screens/Paywall';

/**
 * Le parcours : on accroche, on comprend, on mesure, on parametre, on
 * autorise, on promet. Chaque etape a son rythme — certaines laissent le
 * texte respirer, d'autres enchainent.
 */
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

  const n = (i: number) => () => go(i + 1);

  /**
   * L'ordre suit un arc, pas une liste de reglages.
   *
   * 1. On accroche et on se presente.  2. L'utilisateur nomme LUI-MEME son
   * probleme : une reponse qu'on donne soi-meme pese plus qu'une affirmation
   * qu'on subit.  3. On lui fait constater ce qu'il ne sait plus.  4. Il
   * donne ses chiffres, et le choc qui suit est calcule sur LES SIENS — un
   * chiffre generique ne fait rien, le sien fait mal.  5. On explique le
   * mecanisme : l'autorite justifie le prix a venir.  6. On donne l'espoir
   * AVANT de demander quoi que ce soit.  7. Il configure, il autorise : a
   * chaque oui le suivant coute moins cher, et ce qu'on a construit soi-meme
   * on y tient.  8. La promesse chiffree, a son nom, est le sommet — et le
   * paywall tombe dessus, pas trois ecrans plus loin.  9. Les reglages fins
   * viennent apres la decision.
   */
  const screens = [
    <S1 key="s1" onNext={n(0)} />,
    <Name key="name" onNext={n(1)} />,
    <S3 key="s3" onNext={n(2)} />,
    <Constat key="con" onNext={n(3)} />,
    <S5 key="s5" onNext={n(4)} />,
    <S6 key="s6" onNext={n(5)} />,
    <S6Years key="s6y" onNext={n(6)} />,
    <S7 key="s7" onNext={n(7)} />,
    <S4 key="s4" onNext={n(8)} />,
    <Distractions key="dis" onNext={n(9)} />,
    <Essentials key="ess" onNext={n(10)} />,
    <Permissions key="perm" onDone={n(11)} />,
    <NotificationsAsk key="notif" onNext={n(12)} />,
    <PromiseScreen key="pro" onNext={n(13)} />,
    <Paywall key="pw" onDone={n(14)} />,
    <RulesIntro key="ri" onNext={n(15)} />,
    <RulesPick key="rp" onNext={finish} />,
  ];

  const bar = step > 0 ? (
    <View style={styles.progress}>
      {screens.map((sc, i) => (
        <View key={sc.key} style={[styles.dot, i <= step && styles.dotOn]} />
      ))}
    </View>
  ) : undefined;

  return (
    <View style={styles.root}>
      <ProgressContext.Provider value={bar}>
        {/* Fondu entre ecrans : le changement de page ne saute plus. */}
        <Animated.View
          key={step}
          entering={FadeIn.duration(420)}
          exiting={FadeOut.duration(200)}
          style={StyleSheet.absoluteFill}
        >
          {/* Une etape qui plante ne doit pas emporter tout le parcours. */}
          <StepBoundary key={`b${step}`} onSkip={() => go(step + 1)}>
            {screens[step]}
          </StepBoundary>
        </Animated.View>
      </ProgressContext.Provider>

      {intro && <Intro onDone={() => setIntro(false)} />}
    </View>
  );
}

const TOTAL = 17;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  progress: { flexDirection: 'row', gap: 3 },
  dot: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.accent },
});
