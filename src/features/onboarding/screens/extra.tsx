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
import { MockFeed } from '@/components/MockFeed';
import { haptics } from '@/lib/haptics';
import { track } from '@/services';
import { useOnboardingStore } from '@/store/onboarding';
import { screenYears } from '../calculations';

type P = { onNext: () => void };

/* ---------- Le chiffre, mis bout a bout ---------- */

/**
 * Ce que son estimation coute, en une seule ligne.
 *
 * L'ecran d'avant lui a fait DEVINER son temps d'ecran. Celui-ci ne lui
 * apprend rien de nouveau : il fait l'arithmetique a sa place. Trois heures
 * quarante par jour ne veut rien dire ; des annees de vie, ca se sent.
 *
 * Un seul nombre, et rien autour. Il y avait ici trois lignes — par jour, par
 * an, sur dix ans — plus une invitation a verifier le vrai chiffre dans les
 * reglages : un tableau qu'on lit, alors qu'il n'y a qu'une chose a encaisser.
 */
export function Reveal({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const years = Math.round(screenYears(minutes));

  return (
    <Screen cta="Continuer" onPress={onNext} center hue="ember" hueLevel={0.7}>
      <Text variant="displayM" style={st.mid}>
        Ce que ça fait, mis bout à bout.
      </Text>

      <Animated.View entering={FadeIn.delay(400).duration(760)}>
        <Text
          variant="hero"
          color={c.danger}
          style={[st.mid, { marginTop: space.xl }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {years} ans
        </Text>
        <Text variant="lead" tone="secondary" style={[st.mid, { marginTop: space.md }]}>
          de ta vie, à ce rythme.
        </Text>
      </Animated.View>
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
  const [filtered, setFiltered] = useState(false);

  // On laisse le temps de reconnaitre un fil normal AVANT de le filtrer :
  // filtre tout de suite, il n'y a plus rien a comparer.
  useEffect(() => {
    const t = setTimeout(() => { setFiltered(true); haptics.success(); }, 1900);
    return () => clearTimeout(t);
  }, []);

  return (
    <Screen cta="Continuer" onPress={onNext} hue="accent">
      <Text variant="displayM" style={st.mid}>
        Ton Instagram, sans le fil sans fin.
      </Text>

      <View style={st.stage}>
        <PhoneFrame width={196}>
          <MockFeed filtered={filtered} />
        </PhoneFrame>
      </View>
    </Screen>
  );
}

/* ---------- D'ou viens-tu ---------- */

const SOURCES: [string, string][] = [
  ['tiktok', 'TikTok'],
  ['instagram', 'Instagram'],
  ['friend', 'Un ami m’en a parlé'],
  ['appstore', 'L’App Store'],
  ['other', 'Ailleurs'],
];

/**
 * « Comment as-tu connu UnSwipe ? »
 *
 * Une question facile, posee juste apres les ecrans qui pesent : elle casse
 * le rythme sans rien demander d'intime. Et c'est la seule mesure d'acquisition
 * qu'on aura jamais — l'App Store ne dit pas d'ou viennent les gens.
 */
export function Attribution({ onNext }: P) {
  const [pick, setPick] = useState<string | null>(null);
  const setSource = useOnboardingStore((x) => x.setSource);

  return (
    <Screen cta="Continuer" onPress={onNext} disabled={!pick} hue="deep">
      <Text variant="displayM">Comment tu nous as trouvés ?</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
        Ça nous aide à savoir où parler aux gens comme toi.
      </Text>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        {SOURCES.map(([k, label]) => (
          <SelectCard
            key={k}
            label={label}
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
  const name = useOnboardingStore((x) => x.firstName);

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
      cta="Soutenir"
      onPress={() => { void ask(); }}
      secondary="Plus tard"
      onSecondary={onNext}
      center
      hue="accent"
    >
      <Animated.View entering={FadeIn.duration(520)} style={st.stars}>
        {Array.from({ length: 5 }, (_, i) => (
          <Animated.View key={i} entering={FadeIn.delay(200 + i * 110).duration(360)}>
            <Star size={26} strokeWidth={1.6} color={c.accent} fill={c.accent} />
          </Animated.View>
        ))}
      </Animated.View>

      <Text variant="displayM" style={[st.mid, { marginTop: space.xl }]}>
        {name
          ? `${name}, soutiens la communauté UnSwipe.`
          : 'Soutiens la communauté UnSwipe.'}
      </Text>
      <Text variant="lead" tone="secondary" style={[st.mid, { marginTop: space.md }]}>
        On essaie de rendre leur temps aux gens.
      </Text>
    </Screen>
  );
}

// Aucune couleur ici : les trois ecrans qui s'en servent prennent la leur
// directement sur la palette, au rendu.
const sheet = () => StyleSheet.create({
  mid: { textAlign: 'center' },
  stage: { alignItems: 'center', marginTop: space.xl },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});
