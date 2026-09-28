import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing, FadeIn, FadeOut, runOnJS, useAnimatedStyle, useSharedValue,
  withDelay, withTiming,
} from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { SelectCard } from '@/components/SelectCard';
import { Text } from '@/components/type/Text';
import { PhoneFrame } from '@/components/PhoneFrame';
import { type CortiLevel } from '@/components/Corti';
import { CortiRig } from '@/components/CortiRig';
import { FaceCloud } from '@/components/FaceCloud';
import { MockFeed, MockTabBar } from '@/components/MockFeed';
import { haptics } from '@/lib/haptics';
import { track } from '@/services';
import { useT } from '@/i18n';
import { useOnboardingStore } from '@/store/onboarding';

type P = { onNext: () => void };

/* ---------- Le chiffre, mis bout a bout ---------- */


/* ---------- Corti ---------- */

/**
 * La rencontre.
 *
 * Elle arrive juste apres le prenom, pour que Corti puisse dire bonjour par
 * son nom : une mascotte qui se presente a quelqu'un d'anonyme n'est qu'un
 * dessin de plus. Et elle arrive AVANT les ecrans qui pesent, pour qu'on ait
 * quelqu'un a cote de soi pendant qu'on regarde ses propres chiffres.
 */
export function Meet({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d, t } = useT();
  const name = useOnboardingStore((x) => x.firstName);

  return (
    <Screen cta={d.corti.meetCta} onPress={onNext} center hue="accent">
      <Animated.View entering={FadeIn.duration(700)} style={st.mid}>
        {/*
          Il ACCUEILLE : grands yeux ouverts, sourire franc.

          Il se presentait en veilleuse — paupieres tombantes, bouche plate —
          pour tenir l'arc « il va mal, puis mieux ». Sauf que c'est l'ecran ou
          on le rencontre, et on ne s'attache pas a quelqu'un qui a l'air de
          s'ennuyer de nous voir. L'arc n'y perd rien : il va bien quand on le
          rencontre, il s'eteint pendant le constat, il se retablit apres. La
          chute est meme plus nette, puisqu'on l'a connu en forme.
        */}
        <CortiRig level={2} size={220} expression="ravi" arrive />
      </Animated.View>

      <Text variant="displayM" style={[st.mid, { marginTop: space.xl }]}>
        {name ? t(d.corti.meetTitleNamed, { name }) : d.corti.meetTitle}
      </Text>
      <Text variant="lead" tone="secondary" style={[st.mid, { marginTop: space.md }]}>
        {d.corti.meetBody}
      </Text>
      <Text variant="label" color={c.accent} style={[st.mid, { marginTop: space.lg }]}>
        {d.corti.meetKicker}
      </Text>
    </Screen>
  );
}

/** Les paliers que Corti traverse. Les phrases viennent du dictionnaire. */
const ARC: { n: number; level: CortiLevel; key: 'arc1' | 'arc2' | 'arc3' | 'arc4' }[] = [
  { n: 1, level: 0, key: 'arc1' },
  { n: 7, level: 1, key: 'arc2' },
  { n: 30, level: 2, key: 'arc3' },
  { n: 90, level: 3, key: 'arc4' },
];

const STEP_MS = 1750;

/**
 * Quatre-vingt-dix jours, montres et non dits.
 *
 * C'est le seul ecran du parcours qui promet quelque chose de LONG, et une
 * promesse longue ecrite en une phrase ne se ressent pas. Corti la traverse
 * sous les yeux : elle s'allume palier par palier, et on regarde le trajet
 * plutot que de lire une duree.
 *
 * Le defilement est automatique et ne se rejoue pas : on le regarde une fois,
 * comme on regarderait quelqu'un aller mieux.
 */
export function Ninety({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d, t } = useT();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (i >= ARC.length - 1) return;
    const t = setTimeout(() => { setI(i + 1); haptics.tick(); }, STEP_MS);
    return () => clearTimeout(t);
  }, [i]);

  const at = ARC[i];
  const done = i >= ARC.length - 1;

  return (
    <Screen
      cta={d.pay.ctaPlain}
      onPress={onNext}
      // On laisse le trajet aller jusqu'au bout : passer avant la fin, c'est
      // n'avoir rien vu.
      disabled={!done}
      center
      hue="accent"
      hueLevel={i / (ARC.length - 1)}
    >
      <View style={st.mid}>
        <CortiRig level={at.level} size={190} />
      </View>

      {/* Les deux lignes ont une place FIXE : sans elle, une legende plus
          longue recentrerait Corti a chaque palier. */}
      <View style={st.arcSlot}>
        <Animated.View key={at.n} entering={FadeIn.duration(520)} style={st.mid}>
          <Text variant="label" color={c.accent}>
            {t(d.corti.day, { n: at.n }).toUpperCase()}
          </Text>
          <Text variant="lead" tone="secondary" style={[st.mid, { marginTop: space.sm }]}>
            {d.corti[at.key]}
          </Text>
        </Animated.View>
      </View>

      <View style={st.dots}>
        {ARC.map((a, k) => (
          <View key={a.n} style={[st.dot, k <= i && { backgroundColor: c.accent }]} />
        ))}
      </View>

      {/* La duree est un fragment colore au milieu de la phrase : le texte
          entoure donc un marqueur, plutot que d'etre coupe en trois morceaux
          qui ne se traduiraient pas dans le meme ordre. */}
      <Text variant="displayM" style={[st.mid, { marginTop: space.xl }]}>
        {t(d.corti.ninety, { d: '\u0000' }).split('\u0000')[0]}
        <Text variant="displayM" color={c.accent}>{d.corti.ninetyDays}</Text>
        {t(d.corti.ninety, { d: '\u0000' }).split('\u0000')[1]}
      </Text>
    </Screen>
  );
}

/* ---------- La demonstration ---------- */

/**
 * Le meme fil, avant et apres. Une seule fois, sans qu'on demande rien.
 *
 * Tout ce qui precede se raconte avec des mots. Ici on MONTRE, et c'est le
 * seul ecran du parcours qui prouve quelque chose : les reels tombent, le
 * reste du fil ne bouge pas. Ca tient en deux secondes de regard, et il n'y a
 * donc rien a ecrire autour — une pastille qui compte les reels retires et un
 * paragraphe explicatif ne faisaient que rediger ce qui etait deja a l'image.
 */
/** Les trois temps de la demonstration. */
type Beat = 'raw' | 'filtered' | 'zoom';

/*
 * Les temps de la demonstration, RALLONGES.
 *
 * Elle se jouait en trois secondes et demie : on voyait qu'il se passait
 * quelque chose sans avoir le temps de voir QUOI. Or tout l'ecran tient dans
 * un detail de quatorze points de haut — un bouton qui s'en va. Chaque temps
 * laisse maintenant le regard arriver avant que le suivant commence, et le
 * plus long est celui ou la barre est grossie AVEC son onglet : c'est la
 * seconde et demie pendant laquelle on enregistre ce qui va disparaitre.
 */
const RAW_MS = 2200;    // le temps de reconnaitre un fil ORDINAIRE
const FALL_MS = 1600;   // la cascade, plus un vrai temps de pose
const HELD_MS = 1600;   // la barre grossie, l'onglet Reels ENCORE la

/** La largeur du telephone. Le fil est dessine pour 188 points utiles,
 *  d'ou le rapport passe a MockFeed : le cadre lui en prend huit. */
const PHONE = 172;
/** La hauteur de la barre du bas a cette echelle : deux marges de 8 et une
 *  icone de 14, le tout mis a l'echelle du fil. Le repere s'y ajuste. */
const BAR = Math.round(((PHONE - 8) / 188) * 30);

/**
 * La preuve, en trois temps — parce que deux ne suffisaient pas.
 *
 * On voyait les Reels tomber, et on en concluait qu'UnSwipe CACHE des
 * publications. Ce qui laisse entiere la seule question que tout le monde se
 * pose : « et si j'appuie sur l'onglet Reels ? ». La barre du bas y repond
 * depuis le debut, mais elle fait quatorze points de haut dans une maquette
 * de telephone — personne ne la regarde. On vient donc la chercher : elle
 * sort du cadre, grossie, son onglet Reels ENCORE LA, puis il s'efface sous
 * les yeux et les autres boutons se rapprochent pour combler le trou.
 *
 * L'ordre fait tout. Montrer la barre deja amputee ne prouve rien, on ne sait
 * pas ce qu'il y avait avant. Il faut voir la porte, PUIS la voir partir.
 */
export function Proof({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const [beat, setBeat] = useState<Beat>('raw');
  const [tab, setTab] = useState(true);

  useEffect(() => {
    const ts = [
      setTimeout(() => { setBeat('filtered'); haptics.success(); }, RAW_MS),
      setTimeout(() => setBeat('zoom'), RAW_MS + FALL_MS),
      setTimeout(() => { setTab(false); haptics.stop(); }, RAW_MS + FALL_MS + HELD_MS),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  // Le telephone s'efface pendant qu'on regarde la barre. Deux choses nettes
  // au meme instant et l'oeil ne sait pas laquelle suivre ; il ne reste alors
  // de la sequence qu'une impression de mouvement.
  const back = useSharedValue(0);
  useEffect(() => {
    back.value = withTiming(beat === 'zoom' ? 1 : 0, {
      duration: 900, easing: Easing.inOut(Easing.cubic),
    });
  }, [beat, back]);
  const away = useAnimatedStyle(() => ({
    opacity: 1 - back.value * 0.5,
    transform: [{ scale: 1 - back.value * 0.05 }],
  }));

  /*
    La barre montee reste MONTEE (pas de demontage a chaque temps) : c'est ce
    qui lui permet d'animer la disparition de son propre onglet. Remontee au
    moment ou l'onglet part, elle apparaitrait deja sans lui.
  */
  const pop = useSharedValue(0);
  useEffect(() => {
    // Elle MONTE, elle ne surgit pas : un rebond sec fait sursauter l'oeil et
    // il arrive apres le mouvement. Un ressort long le laisse suivre.
    pop.value = withDelay(beat === 'zoom' ? 220 : 0, withTiming(beat === 'zoom' ? 1 : 0, {
      duration: 900, easing: Easing.out(Easing.back(1.1)),
    }));
  }, [beat, pop]);
  const rise = useAnimatedStyle(() => ({
    // Le rebond depasse 1 : on borne l'opacite, pas l'echelle — c'est l'echelle
    // qui fait le saut hors du cadre.
    opacity: Math.min(1, pop.value * 2),
    transform: [{ translateY: (1 - pop.value) * 30 }, { scale: 0.7 + pop.value * 0.3 }],
  }));

  // Elle suit l'ONGLET, pas le temps : pendant les huit dixiemes de seconde
  // ou la barre est grossie mais complete, elle annoncait deja son depart.
  const line = beat === 'raw' ? d.proof.raw : tab ? d.proof.fall : d.proof.tab;

  return (
    <Screen cta={d.pay.ctaPlain} onPress={onNext} hue="accent" center>
      <Text variant="displayM" style={st.mid}>{d.proof.title}</Text>

      <View style={st.proofStage}>
        <View style={st.phoneWrap}>
          <Animated.View style={away}>
            {/* Le telephone tient dans l'ecran SANS defilement. A 196 points il
                mesurait 425 de haut, et la barre du bas — tout l'objet de cette
                sequence — passait sous la ligne de flottaison : l'animation se
                jouait en entier pour quelqu'un qui n'en voyait que le debut. */}
            <PhoneFrame width={PHONE}>
              <MockFeed filtered={beat !== 'raw'} tab={tab} drift u={(PHONE - 8) / 188} />
            </PhoneFrame>
          </Animated.View>

          {/* Le repere. Sans lui, la barre grossie flotte au-dessus du
              telephone sans qu'on sache d'ou elle sort — on lit une barre
              d'outils de plus, pas un agrandissement. Il cerne l'original,
              et le lien se fait tout seul. */}
          <Animated.View
            style={[st.ring, rise, { borderColor: c.accent, shadowColor: c.accent }]}
            pointerEvents="none"
          />
        </View>

        <Animated.View
          style={[
            st.loupe, rise,
            { backgroundColor: c.night, borderColor: withAlpha(c.accent, 0.4) },
          ]}
          pointerEvents="none"
          testID="proof-loupe"
        >
          {/* Le depart de l'onglet dure presque une seconde. A trois cents
              millisecondes il avait disparu avant qu'on ait fini de compter
              les boutons — on voyait un changement, pas un depart. */}
          <MockTabBar u={2.4} gone={!tab} ms={900} />
        </Animated.View>
      </View>

      {/* Une reserve de hauteur FIXE : la phrase change a chaque temps, et
          sans elle le telephone remonterait a chaque fois qu'elle raccourcit. */}
      <View style={st.sayings}>
        <Animated.View
          key={beat}
          style={st.saying}
          entering={FadeIn.duration(420)}
          exiting={FadeOut.duration(200)}
        >
          <Text variant="lead" tone="secondary" style={st.mid}>{line}</Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

/* ---------- D'ou viens-tu ---------- */

/** Les deux premieres sont des noms propres : elles ne se traduisent pas. */
const SOURCES: ['tiktok' | 'instagram' | 'friend' | 'appstore' | 'other', string | null][] = [
  ['tiktok', 'TikTok'],
  ['instagram', 'Instagram'],
  ['friend', null],
  ['appstore', null],
  ['other', null],
];

/**
 * « Comment as-tu connu UnSwipe ? »
 *
 * Une question facile, posee juste apres les ecrans qui pesent : elle casse
 * le rythme sans rien demander d'intime. Et c'est la seule mesure d'acquisition
 * qu'on aura jamais — l'App Store ne dit pas d'ou viennent les gens.
 */
export function Attribution({ onNext }: P) {
  const { d } = useT();
  const [pick, setPick] = useState<string | null>(null);
  const setSource = useOnboardingStore((x) => x.setSource);

  return (
    <Screen cta={d.pay.ctaPlain} onPress={onNext} disabled={!pick} hue="deep">
      <Text variant="displayM">{d.source.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
        {d.source.body}
      </Text>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        {SOURCES.map(([k, proper]) => (
          <SelectCard
            key={k}
            label={proper ?? d.source[k as 'friend' | 'appstore' | 'other']}
            selected={pick === k}
            onPress={() => {
              haptics.tick();
              setPick(k);
              setSource(k);
              track('source_answered', { source: k });
            }}
          />
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Les etoiles ---------- */

/**
 * La demande de soutien.
 *
 * Elle ne demande pas un service, elle propose d'en rendre un : ce qu'on
 * soutient, c'est la communaute, pas le chiffre d'affaires d'une app. C'est
 * aussi pour ca que le bouton dit « Soutenir » et non « mettre cinq etoiles » —
 * personne n'aime qu'on lui dicte sa note.
 *
 * Elle ne bloque rien : la feuille d'Apple est plafonnee a trois apparitions
 * par an et ne dit jamais si elle s'est montree, donc on avance dans tous les
 * cas.
 *
 * A savoir : sur une version distribuee par TestFlight, iOS ne montre RIEN.
 * L'ecran reste, le bouton avance, et c'est normal — ca ne se verra qu'une
 * fois l'app publiee.
 */
export function RateAsk({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();

  const ask = async () => {
    haptics.press();
    try {
      if (await StoreReview.hasAction()) await StoreReview.requestReview();
    } catch {
      /* rien a faire : un avis n'est pas une etape a franchir */
    }
    onNext();
  };

  return (
    <Screen
      cta={d.rate.cta}
      onPress={() => { void ask(); }}
      secondary={d.rate.later}
      onSecondary={onNext}
      center
      hue="accent"
    >
      {/*
        Les visages derivent AUTOUR de Corti.
        Une grille de portraits carres se lit comme une page d'equipe ; des
        ronds qui flottent se lisent comme des gens, et c'est le seul point de
        cet ecran. Corti au centre relie la communaute a ce qu'on y fait.
      */}
      <View style={st.cloud}>
        <FaceCloud height={280} />
        <View style={st.cloudMid} pointerEvents="box-none">
          {/*
            Niveau deux, pas trois : cet ecran precede la promesse, et la
            montrer au sommet ici puis un cran plus bas juste apres ferait
            reculer son etat. Le sommet est reserve au paywall, qui le propose.
          */}
          <CortiRig level={2} size={112} />
        </View>
      </View>

      <Animated.View entering={FadeIn.delay(600).duration(520)} style={st.stars}>
        {Array.from({ length: 5 }, (_, i) => (
          <Animated.View key={i} entering={FadeIn.delay(700 + i * 110).duration(360)}>
            <Star size={22} strokeWidth={1.6} color={c.accent} fill={c.accent} />
          </Animated.View>
        ))}
      </Animated.View>

      <Text variant="displayM" style={[st.mid, { marginTop: space.lg }]}>
        {d.rate.title}
      </Text>
      <Text variant="lead" tone="secondary" style={[st.mid, { marginTop: space.md }]}>
        {d.rate.body}
      </Text>
    </Screen>
  );
}

// Aucune couleur ici : les trois ecrans qui s'en servent prennent la leur
// directement sur la palette, au rendu.
const sheet = () => StyleSheet.create({
  mid: { textAlign: 'center', alignItems: 'center' },
  arcSlot: { height: 96, justifyContent: 'center', marginTop: space.lg },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: space.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF22' },
  stage: { alignItems: 'center', marginTop: space.xl },
  proofStage: { alignSelf: 'stretch', alignItems: 'center', marginTop: space.md },
  phoneWrap: { width: PHONE },
  ring: {
    position: 'absolute', left: 3, right: 3, bottom: 3, height: BAR + 2,
    borderWidth: 1.5, borderRadius: 11,
    shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  loupe: {
    position: 'absolute', left: 0, right: 0, bottom: 58,
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
  },
  sayings: { height: 56, marginTop: space.lg },
  saying: { position: 'absolute', left: 0, right: 0, top: 0 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  gaugeStage: { height: 190, alignItems: 'center', justifyContent: 'center' },
  slideHit: { alignSelf: 'stretch', height: 56, justifyContent: 'center' },
  rail: { height: 6, borderRadius: 3, overflow: 'hidden' },
  railOn: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  notches: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  notch: { width: 3, height: 3, borderRadius: 2 },
  knob: {
    position: 'absolute', left: -13, width: 26, height: 26, borderRadius: 13,
    shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  stepLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignSelf: 'stretch', paddingHorizontal: space.lg, marginTop: space.xs,
  },
  cloud: { alignSelf: 'stretch', justifyContent: 'center' },
  cloudMid: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
});

/* ---------- Ou en est ton cerveau ---------- */

/**
 * Le curseur de sante : on place Corti soi-meme.
 *
 * C'est le seul ecran ou l'on ne repond pas a une question mais ou l'on REGLE
 * quelque chose, et ou la reponse se voit tout de suite : plus on monte, plus
 * il se redresse ; plus on descend, plus il s'affaisse. On finit presque
 * toujours par le mettre bas, et on l'a fait soi-meme — c'est ce qui rend le
 * constat impossible a contester, sans qu'on ait rien affirme.
 *
 * Le curseur n'est pas un composant tiers : quatre paliers suffisent, et ce
 * sont exactement les quatre etats que Corti sait prendre.
 */
/** Les quatre paliers, et ou ils tombent sur la piste. */
const STOPS: CortiLevel[] = [0, 1, 2, 3];

export function Health({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const [level, setLevel] = useState<CortiLevel>(1);

  /*
    Un vrai curseur, et Corti qui suit LE DOIGT.

    C'etaient quatre barres a toucher. Ca marche, et ca ne raconte rien : on
    appuie sur la troisieme, Corti change, on n'a rien senti passer. Sous le
    doigt, en continu, ce n'est plus un formulaire — on le fait s'affaisser et
    se redresser soi-meme, et c'est ce geste-la qu'on se rappelle quand
    l'ecran suivant dit ce que les reels lui font.

    Le palier ne remonte au rendu QUE s'il a change : sinon chaque pixel
    parcouru redessinerait ses dix calques, et le curseur accrocherait.
  */
  const track = useSharedValue(0);
  const x = useSharedValue(0);
  const at = useSharedValue<number>(1);

  const place = (n: CortiLevel) => {
    if (n === level) return;
    haptics.tick();
    setLevel(n);
  };

  const slide = (px: number) => {
    'worklet';
    const w = Math.max(1, track.value);
    x.value = Math.min(Math.max(px, 0), w);
    const n = Math.round((x.value / w) * 3);
    if (n !== at.value) {
      at.value = n;
      runOnJS(place)(n as CortiLevel);
    }
  };

  const pan = Gesture.Pan()
    .onBegin((e) => { slide(e.x); })
    .onChange((e) => { slide(e.x); })
    .shouldCancelWhenOutside(false);
  const tap = Gesture.Tap().onEnd((e) => { slide(e.x); });

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value }));

  return (
    <Screen cta={d.corti.healthCta} onPress={onNext} center hue="warm">
      <Text variant="displayM" style={st.mid}>{d.corti.healthTitle}</Text>
      <Text variant="lead" tone="secondary" style={[st.mid, { marginTop: space.md }]}>
        {d.corti.healthBody}
      </Text>

      {/* Sa place est FIXE : il grandit et retrecit selon le palier, et sans
          reserve tout le bas de l'ecran monterait et descendrait avec lui. */}
      <View style={st.gaugeStage}>
        <CortiRig level={level} size={168} />
      </View>

      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        {/* La zone tactile deborde largement la piste : une piste de six
            points de haut est increvable au pouce. */}
        <View
          style={st.slideHit}
          onLayout={(e) => {
            track.value = e.nativeEvent.layout.width;
            // La position de depart suit le palier initial, sinon le curseur
            // est a gauche pendant que Corti est en veilleuse.
            x.value = (e.nativeEvent.layout.width / 3) * level;
          }}
          accessibilityRole="adjustable"
          accessibilityValue={{ min: 0, max: 3, now: level }}
        >
          <View style={[st.rail, { backgroundColor: withAlpha(c.mist, 0.14) }]}>
            <Animated.View style={[st.railOn, fill, { backgroundColor: c.accent }]} />
          </View>
          {/* Les quatre reperes : on voit qu'il y a des crans, et ou ils sont. */}
          <View style={st.notches} pointerEvents="none">
            {STOPS.map((n) => (
              <View
                key={n}
                style={[st.notch, { backgroundColor: withAlpha(c.mist, level >= n ? 0 : 0.3) }]}
              />
            ))}
          </View>
          <Animated.View
            style={[st.knob, knob, { backgroundColor: c.accent, shadowColor: c.accent }]}
            pointerEvents="none"
          />
        </View>
      </GestureDetector>

      <View style={st.stepLabels}>
        <Text variant="label" tone="tertiary">{d.corti.healthLow}</Text>
        <Text variant="label" tone="tertiary">{d.corti.healthHigh}</Text>
      </View>
    </Screen>
  );
}
