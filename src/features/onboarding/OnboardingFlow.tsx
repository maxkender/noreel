import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ForcedTheme, useColors, type Palette } from '@/theme/useColors';
import { easings } from '@/theme/motion';
import { useOnboardingStore } from '@/store/onboarding';
import { track } from '@/services';
import { ProgressContext } from '@/components/ProgressContext';
import { Intro } from '@/components/Intro';
import { StepBoundary } from '@/components/StepBoundary';
import { S1, S6, S6Years } from './screens';
import { Constat, Name, NotificationsAsk, PromiseScreen } from './screens/setup';
import { Permissions } from './screens/Permissions';
import { Activities } from './screens/Activities';
import { Attribution, Health, Meet, Ninety, Proof, RateAsk } from './screens/extra';
import { Finale } from './Finale';
import { Paywall } from './screens/Paywall';
import { AgeAsk, Analysis, Compare, Guess } from './screens/time';
import { Dopamine, LovePage, NothingLands, Reclaim, ReceptorsPage } from './screens/science';

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

  /*
    Un seul « suivant », et sans numero.
    Chaque ecran portait son propre indice — n(0), n(1), n(2)… — qu'il
    fallait renumeroter a la main des qu'on en inserait ou retirait un. Ca
    vient de deriver d'un cran en supprimant un ecran, et un ecran se
    trouvait saute. Le handler part maintenant de l'etape AFFICHEE : seul
    l'ecran monte peut l'appeler, donc il ne peut pas se tromper de place.
  */
  const next = useCallback(() => go(step + 1), [go, step]);

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
   *
   * Le rythme compte autant que l'ordre. Apres les ecrans qui pesent viennent
   * deux demandes legeres — d'ou viens-tu, puis le soutien — avant la
   * promesse. L'ecran de demonstration est le seul du parcours qui prouve
   * quelque chose ; il arrive juste apres le manifeste, la ou l'on vient de
   * dire ce qu'on croit.
   *
   * Trois autres ecrans sont partis, sur la meme regle : un ecran doit
   * DEMANDER quelque chose, en DONNER une, ou porter un coup. Celui qui se
   * contente d'informer fait attendre.
   *
   * La question sur la frequence faisait la troisieme d'affilee, apres le
   * curseur de sante et le constat — et sa reponse ne servait qu'a une
   * statistique. Le manifeste disait en six lignes tapees ce que l'ecran de
   * demonstration MONTRE trois ecrans plus loin ; entre les deux, la
   * demonstration gagne. Et les raccourcis d'ecran d'accueil promettaient une
   * fonctionnalite qu'on trouve dans l'app, a un moment ou l'on n'a encore
   * rien installe.
   *
   * L'ecran des reglages fins a quitte le parcours lui aussi. Il faisait
   * defiler des interrupteurs que PERSONNE ne touchait : une demonstration de
   * ce que l'app sait faire, au milieu d'un parcours ou chaque ecran devrait
   * demander ou donner quelque chose. Les memes reglages sont a un geste, une
   * fois dans l'app, le jour ou on les veut.
   *
   * Le code promo a quitte le parcours. Demander « tu as un code ? » avant
   * d'avoir montre le prix apprend a en chercher un : on quitte l'app, on
   * fouille, on ne revient pas. Il vit desormais en lien sur le paywall,
   * APRES le prix — et la promesse tombe directement sur lui.
   */
  /*
    L'ordre raconte quelque chose, et il a change.

    On demandait le temps d'ecran, puis on enchainait sur ce qu'il coute.
    Sauf que le chiffre etait une estimation, et tout le monde sous-estime :
    la suite reposait sur un nombre trop petit. Le vrai chiffre est demande
    juste apres l'estimation — Temps d'ecran connecte, puis recopie depuis
    Reglages — et les deux sont mis cote a cote avant qu'on aille plus loin.
    Tout ce qui suit raisonne sur le vrai.

    Le milieu est devenu une page par idee : la dose, les recepteurs, le
    plaisir qui s'eteint, l'amour. Elles vivaient sur un ecran qu'on tapait
    quatre fois sans que la barre bouge. Et la premiere decision se prend en
    tenant un bouton deux secondes — pas avec le geste qui vaut zero.
  */
  const screens = [
    <S1 key="s1" onNext={next} />,
    <Name key="name" onNext={next} />,
    <Meet key="meet" onNext={next} />,
    <Health key="health" onNext={next} />,
    <Constat key="con" onNext={next} />,
    <Guess key="guess" onNext={next} />,
    <Permissions key="perm" onDone={next} />,
    <Compare key="cmp" onNext={next} />,
    <Analysis key="ana" onNext={next} />,
    <AgeAsk key="age" onNext={next} />,
    <S6 key="s6" onNext={next} />,
    <Activities key="act" onNext={next} />,
    <Dopamine key="dopa" onNext={next} />,
    <ReceptorsPage key="rec" onNext={next} />,
    <NothingLands key="flat" onNext={next} />,
    <LovePage key="love" onNext={next} />,
    <S6Years key="s6y" onNext={next} />,
    <Reclaim key="hold" onNext={next} />,
    <Ninety key="90" onNext={next} />,
    <Proof key="proof" onNext={next} />,
    <NotificationsAsk key="notif" onNext={next} />,
    <Attribution key="src" onNext={next} />,
    <RateAsk key="rate" onNext={next} />,
    <PromiseScreen key="pro" onNext={next} />,
    <Paywall key="pw" onDone={() => setFinale(true)} />,
  ];

  // Le compte se releve APRES le rendu : un ref ne se lit pas pendant.
  // L'effet a tourne bien avant qu'un doigt puisse toucher quoi que ce soit.
  useEffect(() => { count.current = screens.length; });

  /*
    Une barre PLEINE, pas dix-neuf tirets.

    Le parcours compte dix-neuf ecrans : dix-neuf segments de deux points de
    haut separes de trois points font une rangee de pointilles ou l'on ne voit
    ni ou l'on en est, ni combien il reste — et chaque etape n'en allume qu'un
    cinquieme de millimetre, si bien que repondre ne semble faire avancer
    personne. Une seule barre qui GLISSE montre les deux, et son mouvement est
    la recompense de l'ecran qu'on vient de passer.
  */
  const bar = step > 0 ? (
    <View style={styles.progress}>
      <Animated.View
        layout={LinearTransition.duration(420)}
        style={[styles.fill, { flex: Math.max(0.02, (step + 1) / screens.length) }]}
      />
      <View style={{ flex: Math.max(0.001, 1 - (step + 1) / screens.length) }} />
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
  progress: {
    flexDirection: 'row', height: 3, borderRadius: 2,
    overflow: 'hidden', backgroundColor: c.line,
  },
  fill: { borderRadius: 2, backgroundColor: c.accent },
});
