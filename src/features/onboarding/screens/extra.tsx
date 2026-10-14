import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';
import * as StoreReview from 'expo-store-review';
import { Apple, Check, Compass, Ellipsis, Star, Users } from 'lucide-react-native';
import { Image } from 'expo-image';
import { Emblem } from '../scenes/Emblem';
import { withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { SelectCard } from '@/components/SelectCard';
import { Text } from '@/components/type/Text';
import { PhoneFrame } from '@/components/PhoneFrame';
import { FaceCloud } from '@/components/FaceCloud';
import { MockFeed, MockTabBar } from '@/components/MockFeed';
import { haptics } from '@/lib/haptics';
import { track } from '@/services';
import { useT } from '@/i18n';
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { formatHours } from '@/lib/format';
import { HoldRing } from '../scenes/HoldRing';
import { LOGOS } from '@/features/home/AppSlider';

type P = { onNext: () => void };

/* ---------- Le chiffre, mis bout a bout ---------- */


/* ---------- Corti ---------- */


/* ---------- La preparation du programme ---------- */

const PREP_STEP = 1000;
const PREP_ROWS = 5;
/** Le temps de lire « ton programme est pret » avant que le paywall s'ouvre. */
const PREP_TAIL = 1700;

/**
 * Cinq coches avant le paywall, et un anneau qui se remplit.
 *
 * On arrive au prix apres avoir tout donne : ses apps, son chiffre, son
 * objectif, sa signature. Le paywall doit etre la SUITE de tout ca — un
 * programme qu'on ouvre — et non une page de vente posee la. Cinq secondes
 * ou ce qu'on a repondu se transforme sous les yeux en cinq lignes cochees,
 * chacune avec son detail, pendant qu'un anneau se referme autour de Corti.
 * Puis « ton programme est pret », un temps, et le paywall s'ouvre.
 *
 * Chaque coche ARRIVE — elle grandit, sa ligne s'allume, son detail glisse
 * dessous — au lieu de changer d'etat d'un coup. L'anneau avance sans
 * a-coup, et a la fin il eclate une fois autour de Corti.
 */
export function Prep({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d, t } = useT();
  const minutes = useOnboardingStore(effectiveMinutes);
  const [done, setDone] = useState(0);
  const [ready, setReady] = useState(false);
  const ring = useSharedValue(0);
  const burst = useSharedValue(0);
  // La cible : la moitie, arrondie au quart d'heure — la meme que le paywall.
  const target = Math.max(15, Math.round(minutes / 2 / 15) * 15);
  const rows: [string, string][] = [
    [d.prep.s1, d.prep.s1b],
    [d.prep.s2, t(d.prep.s2b, { h: formatHours(target) })],
    [d.prep.s3, d.prep.s3b],
    [d.prep.s4, d.prep.s4b],
    [d.prep.s5, d.prep.s5b],
  ];

  useEffect(() => {
    ring.value = withTiming(1, { duration: PREP_STEP * PREP_ROWS, easing: Easing.inOut(Easing.sin) });
    const ts = Array.from({ length: PREP_ROWS }, (_, i) => setTimeout(() => { setDone(i + 1); haptics.tick(); }, PREP_STEP * (i + 1)));
    const fin = setTimeout(() => {
      setReady(true);
      haptics.success();
      burst.value = withSequence(withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 800 }));
    }, PREP_STEP * PREP_ROWS + 150);
    const end = setTimeout(onNext, PREP_STEP * PREP_ROWS + 150 + PREP_TAIL);
    return () => { ts.forEach(clearTimeout); clearTimeout(fin); clearTimeout(end); };
  }, [onNext, ring, burst]);

  const halo = useAnimatedStyle(() => ({
    opacity: 0.2 + ring.value * 0.35 + burst.value * 0.4,
    transform: [{ scale: 0.8 + ring.value * 0.3 + burst.value * 0.8 }],
  }));

  return (
    <Screen center still hue="accent" hueLevel={ready ? 1 : 0.4}>
      <View style={st.mid}>
        <Animated.View style={[st.prepHalo, { backgroundColor: withAlpha(c.accent, 0.4) }, halo]} pointerEvents="none" />
        <HoldRing progress={ring} size={176} stroke={4}>
          {ready && <Check size={56} strokeWidth={2.4} color={c.accent} />}
        </HoldRing>
      </View>
      <View style={st.prepTitle}>
        <Animated.View key={ready ? 'ready' : 'prep'} entering={FadeIn.duration(420)}>
          <Text variant="displayM" style={st.mid}>{ready ? d.prep.done : d.prep.title}</Text>
        </Animated.View>
      </View>
      <View style={st.prepList}>
        {rows.map(([title, detail], i) => {
          const on = done > i;
          return (
            <View key={title} style={st.prepRow}>
              <View style={[st.prepDot, { backgroundColor: on ? c.accent : withAlpha(c.mist, 0.12) }]}>
                {on && (
                  <Animated.View entering={ZoomIn.springify().damping(11).stiffness(220)}>
                    <Check size={13} strokeWidth={3} color={c.night} />
                  </Animated.View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" tone={on ? undefined : 'tertiary'}>{title}</Text>
                {on && (
                  <Animated.View entering={FadeInDown.duration(380)}>
                    <Text variant="label" tone="tertiary">{detail}</Text>
                  </Animated.View>
                )}
              </View>
            </View>
          );
        })}
      </View>
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
type Beat = 'raw' | 'zoom';

/*
 * Les temps de la demonstration.
 *
 * Tout se passe dans la premiere seconde : on reconnait Instagram le temps
 * d'une image, puis la barre du bas SORT DU CADRE, grossie, pendant que les
 * Reels tombent du fil. On voit les deux a la fois, et c'est voulu : ce
 * sont les deux moities de la meme phrase — on retire un format, pas des
 * publications. Un temps de pose, et l'onglet Reels s'efface de la barre
 * sous les yeux, les autres boutons se rapprochant pour combler le trou.
 *
 * L'ordre fait tout. Montrer la barre deja amputee ne prouve rien : il faut
 * voir la porte, PUIS la voir partir.
 */
const RAW_MS = 300;     // le temps d'une image : on reconnait, on n'attend pas
const HELD_MS = 1000;   // la barre grossie, l'onglet Reels ENCORE la

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
      setTimeout(() => { setBeat('zoom'); haptics.success(); }, RAW_MS),
      setTimeout(() => { setTab(false); haptics.stop(); }, RAW_MS + HELD_MS),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  // Le telephone recule un peu quand la barre sort : assez pour que la barre
  // soit le sujet, pas assez pour qu'on cesse de voir les Reels tomber.
  const back = useSharedValue(0);
  useEffect(() => {
    back.value = withTiming(beat === 'zoom' ? 1 : 0, {
      duration: 900, easing: Easing.inOut(Easing.cubic),
    });
  }, [beat, back]);
  const away = useAnimatedStyle(() => ({
    opacity: 1 - back.value * 0.25,
    transform: [{ scale: 1 - back.value * 0.03 }],
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
    pop.value = withTiming(beat === 'zoom' ? 1 : 0, {
      duration: 700, easing: Easing.out(Easing.back(1.1)),
    });
  }, [beat, pop]);
  const rise = useAnimatedStyle(() => ({
    // Le rebond depasse 1 : on borne l'opacite, pas l'echelle — c'est l'echelle
    // qui fait le saut hors du cadre.
    opacity: Math.min(1, pop.value * 2),
    transform: [{ translateY: (1 - pop.value) * 30 }, { scale: 0.7 + pop.value * 0.3 }],
  }));


  return (
    <Screen cta={d.pay.ctaPlain} onPress={onNext} readyAfter={RAW_MS + HELD_MS + 1400} hue="accent" center>
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
          {/* Le depart de l'onglet prend son temps : trop court, on voit un
              changement, pas un depart. */}
          <MockTabBar u={2.4} gone={!tab} ms={700} />
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
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const [pick, setPick] = useState<string | null>(null);
  const setSource = useOnboardingStore((x) => x.setSource);

  // Le logo pour les reseaux, une icone pour le reste : une ligne sans
  // image se lit moins vite qu'une ligne avec, et on repond du regard.
  const lead = (k: string) => {
    if (k === 'tiktok' || k === 'instagram') {
      return <Image source={LOGOS[k]} style={st.srcLogo} contentFit="contain" />;
    }
    const Icon = k === 'friend' ? Users : k === 'appstore' ? Apple : Ellipsis;
    return (
      <View style={[st.srcIcon, { backgroundColor: withAlpha(c.mist, 0.1) }]}>
        <Icon size={15} strokeWidth={2.2} color={c.mist} />
      </View>
    );
  };

  return (
    <Screen emblem={<Emblem icon={Compass} />} cta={d.pay.ctaPlain} onPress={onNext} disabled={!pick} hue="deep">
      <Text variant="displayM">{d.source.title}</Text>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        {SOURCES.map(([k, proper]) => (
          <SelectCard
            key={k}
            label={proper ?? d.source[k as 'friend' | 'appstore' | 'other']}
            lead={lead(k)}
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
 * cas. Sur TestFlight, iOS ne montre RIEN : l'ecran reste, le bouton avance.
 *
 * Retiree le 5 octobre 2026 apres un refus d'Apple (5.6.3), remise a la
 * demande de Maximilien le 7 : le risque d'un nouveau refus est connu.
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
  // La demande native d'Apple, d'elle-meme, une seconde apres l'arrivee :
  // c'est elle qui compte, pas notre bouton.
  useEffect(() => {
    const id = setTimeout(() => {
      void StoreReview.hasAction().then((ok) => { if (ok) return StoreReview.requestReview(); }).catch(() => {});
    }, 900);
    return () => clearTimeout(id);
  }, []);

  return (
    <Screen
      cta={d.rate.cta}
      onPress={() => { void ask(); }}
      secondary={d.rate.later}
      onSecondary={onNext}
      center
      hue="accent"
    >
      {/* Des ronds qui flottent se lisent comme des gens : c'est le seul point de cet ecran. */}
      <View style={st.cloud}>
        <FaceCloud height={280} />
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
  prepHalo: { position: 'absolute', width: 176, height: 176, borderRadius: 88 },
  prepTitle: { minHeight: 76, justifyContent: 'center', marginTop: space.lg },
  srcLogo: { width: 26, height: 26 },
  prepList: { alignSelf: 'stretch', gap: space.md, marginTop: space.xl, paddingHorizontal: space.xl },
  prepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  prepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  srcIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
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
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  gaugeStage: { height: 200, alignItems: 'center', justifyContent: 'center' },
  wordSlot: { height: 24, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
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
