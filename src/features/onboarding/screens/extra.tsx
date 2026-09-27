import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as StoreReview from 'expo-store-review';
import Animated, {
  Easing, FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { SelectCard } from '@/components/SelectCard';
import { Text } from '@/components/type/Text';
import { PhoneFrame } from '@/components/PhoneFrame';
import { MockFeed, REELS } from '@/components/MockFeed';
import { haptics } from '@/lib/haptics';
import { formatHours, formatLifeDuration } from '@/lib/format';
import { track } from '@/services';
import { useOnboardingStore } from '@/store/onboarding';

type P = { onNext: () => void };

/* ---------- Le chiffre, retourne dans tous les sens ---------- */

/**
 * Ce que son chiffre veut dire, en unites qu'on se represente.
 *
 * L'ecran d'avant lui a fait DEVINER son temps d'ecran. Celui-ci ne lui
 * apprend rien de nouveau : il fait l'arithmetique a sa place. Trois heures
 * quarante par jour ne veut rien dire ; un mois par an, c'est un chiffre
 * qu'on sent.
 *
 * On n'invente aucune moyenne a laquelle se comparer. Un chiffre qu'on ne
 * peut pas verifier decredibilise tous les autres, et celui-la vient de lui :
 * il peut refaire chaque ligne de tete.
 */
export function Reveal({ onNext, onBack }: P & { onBack: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const minutes = useOnboardingStore((x) => x.minutesPerDay);

  const perYear = Math.round((minutes * 365) / 60 / 24);          // jours pleins
  const perTen = formatLifeDuration(Math.round((minutes * 365 * 10) / 60 / 24 / 30.4));

  const rows: [string, string][] = [
    ['Par jour', formatHours(minutes)],
    ['Par an', `${perYear} jours pleins`],
    ['Sur dix ans', perTen],
  ];

  return (
    <Screen
      cta="Continuer"
      onPress={onNext}
      secondary="Ajuster mon chiffre"
      onSecondary={onBack}
      center
      hue="ember"
      hueLevel={0.7}
    >
      <Text variant="displayM" style={st.mid}>
        Ce que ça fait, mis bout à bout.
      </Text>

      <View style={st.table}>
        {rows.map(([k, v], i) => (
          <Animated.View
            key={k}
            entering={FadeIn.delay(300 + i * 260).duration(520)}
            style={st.row}
          >
            <Text variant="label" tone="tertiary">{k}</Text>
            <Text
              variant={i === 2 ? 'displayM' : 'title'}
              color={i === 2 ? c.danger : undefined}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {v}
            </Text>
          </Animated.View>
        ))}
      </View>

      {/*
        On invite a verifier, on n'affirme rien.
        « Les gens sous-estiment de tant pour cent » serait un chiffre que je ne
        peux pas sourcer, pose juste a cote de trois lignes qu'il peut refaire
        de tete — la seule fausse des quatre discrediterait les trois autres.
      */}
      <Animated.View entering={FadeIn.delay(1100).duration(520)}>
        <Text variant="body" tone="secondary" style={st.mid}>
          Ton vrai chiffre est dans Réglages → Temps d’écran. S’il est plus
          haut que ce que tu as deviné, c’est lui qui compte.
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
 * seul ecran du parcours qui prouve quelque chose : trois reels tombent, le
 * reste du fil ne bouge pas. C'est exactement la promesse de l'app, et elle
 * tient en deux secondes de regard.
 */
export function Proof({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
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

      <View style={st.badgeWrap}>
        {filtered ? (
          <Animated.View key="on" entering={FadeIn.duration(420)} style={[st.badge, st.badgeOn]}>
            <Text variant="label" color={c.accent}>{REELS} reels retirés</Text>
          </Animated.View>
        ) : (
          <Animated.View key="off" entering={FadeIn.duration(300)} style={[st.badge, st.badgeOff]}>
            <Text variant="label" color={c.ember}>Le fil, tel quel</Text>
          </Animated.View>
        )}
      </View>

      <Text variant="body" tone="secondary" style={st.mid}>
        Tes messages, tes amis, tes photos : tout reste. Ce qui disparaît,
        c’est ce qui ne s’arrête jamais.
      </Text>
    </Screen>
  );
}

/* ---------- L'engagement ---------- */

const DEEP = '#5B3FD6';
const MID = '#3F57C9';
const LOW = '#26307A';
const INK = '#FFFFFF';
const HOLD_MS = 1800;

/**
 * Maintenir le doigt pour s'engager.
 *
 * Un ecran de rupture, en pleine couleur au milieu d'un parcours sombre, et
 * le seul ou l'on doit FAIRE quelque chose qui coute un peu. Ce n'est pas un
 * ornement : une intention qu'on tient deux secondes sous le doigt se retient
 * mieux qu'un bouton qu'on tape sans lire. Et le contraste de couleur remet
 * l'oeil a zero avant les deux derniers ecrans.
 *
 * Ses couleurs ne suivent pas le theme : comme l'intro et le final, c'est une
 * scene, pas du mobilier.
 */
export function Commit({ onNext }: P) {
  const st = useMemo(() => sheet2(), []);
  const name = useOnboardingStore((x) => x.firstName);
  const p = useSharedValue(0);
  const [done, setDone] = useState(false);

  const finish = () => {
    if (done) return;
    setDone(true);
    haptics.success();
    // Un temps pour voir l'anneau ferme : passer a l'instant donne
    // l'impression que le geste n'a servi a rien.
    setTimeout(onNext, 700);
  };

  const grab = () => {
    haptics.press();
    p.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (ok) => {
      if (ok) runOnJS(finish)();
    });
  };
  const release = () => {
    if (done) return;
    // On revient vite : un retour lent laisse croire que ca compte encore.
    p.value = withTiming(0, { duration: 260 });
  };

  // L'anneau grandit et s'opacifie. Jamais de couleur animee : cette app
  // tombe des qu'on anime une propriete de couleur.
  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + p.value * 0.3 }],
    opacity: 0.25 + p.value * 0.75,
  }));
  const fill = useAnimatedStyle(() => ({ opacity: p.value }));

  return (
    <View style={st.root}>
      <LinearGradient
        colors={[DEEP, MID, LOW]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
        <View style={{ flex: 1 }} />

        <Text variant="displayM" color={INK} style={st.mid}>
          {done
            ? `C’est noté, ${name || 'promis'}.`
            : 'Une dernière chose : décide-le vraiment.'}
        </Text>
        <Text variant="lead" color={withAlpha(INK, 0.8)} style={[st.mid, { marginTop: space.md }]}>
          {done
            ? 'On s’occupe du reste.'
            : 'Maintiens le cercle le temps de dire oui.'}
        </Text>

        <Pressable
          onPressIn={grab}
          onPressOut={release}
          style={st.padWrap}
          accessibilityRole="button"
          accessibilityLabel="Maintenir pour s’engager"
        >
          <Animated.View style={[st.pad, ring]} />
          <Animated.View style={[st.padFill, fill]} />
          <Text variant="button" color={INK}>
            {done ? 'Engagé' : 'Maintiens'}
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />
      </SafeAreaView>
    </View>
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
 * La demande d'avis.
 *
 * Elle est posee ICI, apres la promesse chiffree, parce que c'est le seul
 * moment positif du parcours ou l'on n'a encore rien demande. Elle ne bloque
 * rien : la feuille d'Apple est plafonnee a trois apparitions par an et ne
 * dit jamais si elle s'est montree, donc on avance dans tous les cas.
 *
 * A savoir : sur une version distribuee par TestFlight, iOS ne montre RIEN.
 * L'ecran reste, le bouton avance, et c'est normal — ca ne se verra qu'une
 * fois l'app publiee.
 */
export function RateAsk({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
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
      cta="Mettre cinq étoiles"
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
        {name ? `${name}, on est une petite équipe.` : 'On est une petite équipe.'}
      </Text>
      <Text variant="lead" tone="secondary" style={[st.mid, { marginTop: space.md }]}>
        UnSwipe n’a pas de budget publicitaire. Un avis, c’est ce qui le met
        devant les yeux de quelqu’un d’autre.
      </Text>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  mid: { textAlign: 'center' },
  table: { alignSelf: 'stretch', marginTop: space.xl, gap: space.lg },
  row: {
    alignItems: 'center', gap: 2, paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(c.mist, 0.12),
  },
  stage: { alignItems: 'center', marginTop: space.xl },
  badgeWrap: { alignItems: 'center', height: 30, marginTop: space.lg },
  badge: {
    position: 'absolute',
    paddingHorizontal: space.md, paddingVertical: 6, borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeOff: { borderColor: withAlpha(c.ember, 0.45), backgroundColor: withAlpha(c.ember, 0.1) },
  badgeOn: { borderColor: withAlpha(c.accent, 0.5), backgroundColor: withAlpha(c.accent, 0.12) },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});

// La scene en couleur a ses propres valeurs : elle ne suit pas la palette.
const sheet2 = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: LOW },
  safe: { flex: 1, paddingHorizontal: gutter },
  mid: { textAlign: 'center' },
  padWrap: {
    alignSelf: 'center', marginTop: space.xxl,
    width: 168, height: 168, borderRadius: 84,
    alignItems: 'center', justifyContent: 'center',
  },
  pad: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 84, borderWidth: 2, borderColor: INK,
  },
  padFill: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 84, backgroundColor: withAlpha(INK, 0.22),
  },
});
