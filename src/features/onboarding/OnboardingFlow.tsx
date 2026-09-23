import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ForcedTheme, useColors, type Palette } from '@/theme/useColors';
import { easings } from '@/theme/motion';
import { useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { ProgressContext } from '@/components/ProgressContext';
import { Intro } from '@/components/Intro';
import { StepBoundary } from '@/components/StepBoundary';
import { S1, S3, S4, S5, S6, S6Years, S7 } from './screens';
import {
  Constat, Distractions, Essentials, Manifesto, Name, NotificationsAsk,
  PromiseScreen,
} from './screens/setup';
import { Permissions } from './screens/Permissions';
import { Tune } from './screens/Tune';
import { BarDemo } from './screens/BarDemo';
import { Activities } from './screens/Activities';
import { HomeShortcuts } from './screens/HomeShortcuts';
import { Finale } from './Finale';
import { Paywall } from './screens/Paywall';

/**
 * Le parcours : on accroche, on comprend, on mesure, on parametre, on
 * autorise, on promet. Chaque etape a son rythme — certaines laissent le
 * texte respirer, d'autres enchainent.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);
  const [step, setStep] = useState(0);
  const [intro, setIntro] = useState(true);
  // Le dernier plan, joue une fois le parcours fini.
  const [finale, setFinale] = useState(false);
  const persist = useOnboardingStore((s) => s.setStep);
  const complete = useOnboardingStore((s) => s.complete);
  const start = useOnboardingStore((s) => s.start);

  useEffect(() => { start(); track('onboarding_started'); }, [start]);

  const finish = useCallback(() => {
    complete();
    track('onboarding_completed');
    router.replace('/home');
  }, [complete, router]);

  /**
   * Le nombre d'ecrans est LU sur la liste, jamais recopie.
   *
   * Il etait tenu a la main dans une constante, et il avait derive d'un cran
   * a force d'ajouts : l'avant-dernier ecran croyait etre le dernier, donc
   * il terminait le parcours — et le paywall, juste derriere lui, ne
   * s'affichait plus jamais. Une seconde source de verite pour une chose
   * qu'on modifie souvent finit toujours par mentir.
   *
   * La valeur de depart est volontairement enorme : si elle n'etait pas
   * encore posee, on preferera montrer un ecran de trop que couper le
   * parcours avant sa fin.
   */
  const count = useRef(Number.MAX_SAFE_INTEGER);

  const go = useCallback((next: number) => {
    if (next >= count.current) { finish(); return; }
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
    <Activities key="act" onNext={n(7)} />,
    <S7 key="s7" onNext={n(8)} />,
    <Manifesto key="man" onNext={n(9)} />,
    <S4 key="s4" onNext={n(10)} />,
    <Tune key="tune" onNext={n(11)} />,
    <Distractions key="dis" onNext={n(12)} />,
    <Essentials key="ess" onNext={n(13)} />,
    <Permissions key="perm" onDone={n(14)} />,
    <NotificationsAsk key="notif" onNext={n(15)} />,
    <BarDemo key="bar" onNext={n(16)} />,
    <HomeShortcuts key="short" onNext={n(17)} />,
    <PromiseScreen key="pro" onNext={n(18)} />,
    <Paywall key="pw" onDone={() => setFinale(true)} />,
  ];

  // Le compte se releve APRES le rendu : un ref ne se lit pas pendant.
  // L'effet a tourne bien avant qu'un doigt puisse toucher quoi que ce soit.
  useEffect(() => { count.current = screens.length; });

  const bar = step > 0 ? (
    <View style={styles.progress}>
      {screens.map((sc, i) => (
        <View key={sc.key} style={[styles.dot, i <= step && styles.dotOn]} />
      ))}
    </View>
  ) : undefined;

  return (
    /*
      Le parcours est une scene DESSINEE en sombre : halo, poussiere
      lumineuse, verre qui capte la lumiere. Repeint en clair, chacun de ces
      elements s'inverse — la poussiere devient des salissures, le reflet du
      verre un trait noir. On le fige donc ici, et le reglage de theme ne
      gouverne que l'app, une fois le parcours passe.
    */
    <ForcedTheme.Provider value="dark">
      <View style={styles.root}>
        {/* La barre d'etat suit la scene, pas le reglage de l'app. */}
        <StatusBar style="light" />
        <ProgressContext.Provider value={bar}>
          {/*
            L'ecran suivant monte de quelques points en se revelant PAR-DESSUS
            le precedent, qui tient sa couleur plus longtemps qu'il ne met a
            apparaitre. C'est ce decalage qui compte : avec deux fondus de
            meme duree, la somme des deux opacites passe sous 1 au milieu du
            croisement et le fond nu apparait une fraction de seconde — le
            clignotement noir qu'on voyait a chaque page.
          */}
          <Animated.View
            key={step}
            entering={rise}
            exiting={FadeOut.duration(460)}
            style={StyleSheet.absoluteFill}
          >
            {/* Une etape qui plante ne doit pas emporter tout le parcours. */}
            <StepBoundary key={`b${step}`} onSkip={() => go(step + 1)}>
              {screens[step]}
            </StepBoundary>
          </Animated.View>
        </ProgressContext.Provider>

        {intro && <Intro onDone={() => setIntro(false)} />}
        {finale && <Finale onDone={finish} />}
      </View>
    </ForcedTheme.Provider>
  );
}

/**
 * L'arrivee d'un ecran : il monte de 14 points en se revelant.
 *
 * Ecrit a la main plutot qu'avec `FadeInDown`, pour que l'opacite finisse
 * AVANT le mouvement — l'ecran est lisible pendant qu'il finit de se poser,
 * au lieu de se poser puis de devenir lisible.
 */
function rise() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 14 }] },
    animations: {
      opacity: withTiming(1, { duration: 300, easing: easings.out }),
      transform: [{ translateY: withTiming(0, { duration: 460, easing: easings.out }) }],
    },
  };
}

const sheet = (c: Palette) => StyleSheet.create({
  // Le fond du parcours suit le theme. Fige sur la palette sombre, il
  // apparaissait en noir sous chaque croisement d'ecrans en mode clair.
  root: { flex: 1, backgroundColor: c.night },
  progress: { flexDirection: 'row', gap: 3 },
  dot: { flex: 1, height: 2, borderRadius: 1, backgroundColor: c.line },
  dotOn: { backgroundColor: c.accent },
});
