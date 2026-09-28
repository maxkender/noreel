import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { useColors } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { SelectCard } from '@/components/SelectCard';
import { Text } from '@/components/type/Text';
import { PhoneFrame } from '@/components/PhoneFrame';
import { Corti, type CortiLevel } from '@/components/Corti';
import { FaceCloud } from '@/components/FaceCloud';
import { MockFeed } from '@/components/MockFeed';
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
          Elle se presente en VEILLEUSE, pas en pleine forme.
          Corti est le cerveau de la personne : la montrer rayonnante avant
          d'avoir dit un mot du probleme, puis eteinte deux ecrans plus loin,
          rendait son etat illisible. Elle part fatiguee, elle s'eteint pendant
          le constat, elle se retablit ensuite — un seul arc, dans l'ordre.
        */}
        <Corti level={1} size={220} />
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
        <Corti level={at.level} size={190} />
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
export function Proof({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const [filtered, setFiltered] = useState(false);

  // On laisse le temps de reconnaitre un fil normal AVANT de le filtrer :
  // filtre tout de suite, il n'y a plus rien a comparer.
  useEffect(() => {
    const t = setTimeout(() => { setFiltered(true); haptics.success(); }, 1900);
    return () => clearTimeout(t);
  }, []);

  return (
    <Screen cta={d.pay.ctaPlain} onPress={onNext} hue="accent">
      <Text variant="displayM" style={st.mid}>{d.proof.title}</Text>

      <View style={st.stage}>
        <PhoneFrame width={196}>
          <MockFeed filtered={filtered} drift />
        </PhoneFrame>
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
          <Corti level={2} size={112} />
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
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  cloud: { alignSelf: 'stretch', justifyContent: 'center' },
  cloudMid: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
});
