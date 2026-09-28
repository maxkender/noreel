import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { useT } from '@/i18n';
import type { CortiLevel } from './Corti';

/*
 * Corti v3 : le rendu detaille, en calques.
 *
 * La mascotte vectorielle reste le dessin de secours — petite, legere, sans
 * dependance, parfaite pour une vignette ou un widget. Mais elle a une limite
 * qu'aucun reglage ne rattrape : ses degrades, ses reflets et ses plis sont
 * approximes a la main, et c'est exactement ce qu'on me reprochait — « il
 * n'est pas assez beau notre cerveau ». Le studio a livre le rendu qu'il faut,
 * en quarante-trois calques poses sur un meme cadre de 400 points : empiles a
 * la meme taille, ils se superposent au pixel pres.
 *
 * Le montage et les durees viennent de la vue de reference du studio, pas de
 * moi : leur brief dit de REPRODUIRE ces timings, pas de les inventer. Les
 * points d'ancrage aussi — tout pivote autour de (0,5 ; 0,83), c'est-a-dire
 * ses pieds, et c'est ce qui fait qu'il respire au lieu de grossir.
 */

/* ---------- Les calques ---------- */

// Les chemins doivent etre litteraux : l'empaqueteur lit ces appels sans
// executer le fichier, une variable ne lui dirait rien.
const AURA = [
  null,
  require('@/assets/rig/rig-aura-1.png'),
  require('@/assets/rig/rig-aura-2.png'),
  require('@/assets/rig/rig-aura-3.png'),
];
const BODY = [
  null,
  require('@/assets/rig/rig-body-1.png'),
  require('@/assets/rig/rig-body-2.png'),
  require('@/assets/rig/rig-body-3.png'),
];
const FEET = [
  null,
  require('@/assets/rig/rig-feet-1.png'),
  require('@/assets/rig/rig-feet-2.png'),
  require('@/assets/rig/rig-feet-3.png'),
];
const ARMS = {
  down: [null,
    require('@/assets/rig/rig-arms-down-1.png'),
    require('@/assets/rig/rig-arms-down-2.png'),
    require('@/assets/rig/rig-arms-down-3.png')],
  out: [null,
    require('@/assets/rig/rig-arms-out-1.png'),
    require('@/assets/rig/rig-arms-out-2.png'),
    require('@/assets/rig/rig-arms-out-3.png')],
  up: [null,
    require('@/assets/rig/rig-arms-up-1.png'),
    require('@/assets/rig/rig-arms-up-2.png'),
    require('@/assets/rig/rig-arms-up-3.png')],
  wave: [null,
    require('@/assets/rig/rig-arms-wave-1.png'),
    require('@/assets/rig/rig-arms-wave-2.png'),
    require('@/assets/rig/rig-arms-wave-3.png')],
};
const EYES = {
  open: require('@/assets/rig/rig-eyes-open.png'),
  blink: require('@/assets/rig/rig-eyes-blink.png'),
  happy: require('@/assets/rig/rig-eyes-happy.png'),
  sleepy: require('@/assets/rig/rig-eyes-sleepy.png'),
  surprised: require('@/assets/rig/rig-eyes-surprised.png'),
  wink: require('@/assets/rig/rig-eyes-wink.png'),
  sad: require('@/assets/rig/rig-eyes-sad.png'),
  determined: require('@/assets/rig/rig-eyes-determined.png'),
};
const MOUTH = {
  smile: require('@/assets/rig/rig-mouth-smile.png'),
  open: require('@/assets/rig/rig-mouth-open.png'),
  laugh: require('@/assets/rig/rig-mouth-laugh.png'),
  o: require('@/assets/rig/rig-mouth-o.png'),
  flat: require('@/assets/rig/rig-mouth-flat.png'),
  frown: require('@/assets/rig/rig-mouth-frown.png'),
  wavy: require('@/assets/rig/rig-mouth-wavy.png'),
  smirk: require('@/assets/rig/rig-mouth-smirk.png'),
};
const SHADOW = require('@/assets/rig/rig-shadow.png');
const BLUSH = require('@/assets/rig/rig-blush.png');
const SPARKLES = require('@/assets/rig/rig-sparkles.png');
const ICE = require('@/assets/rig/rig-ice.png');
const ZZZ = require('@/assets/rig/rig-zzz.png');
const FLAT = require('@/assets/rig/corti-0-ecrase.png');

/* ---------- Le vocabulaire ---------- */

export type CortiExpression =
  | 'auto' | 'neutre' | 'content' | 'rire' | 'surpris'
  | 'clin' | 'somnolent' | 'triste' | 'determine' | 'ravi';
export type CortiPose = 'idle' | 'wave' | 'up' | 'sit' | 'sleep' | 'float';
export type CortiReactionKind =
  | 'tap' | 'no' | 'wave' | 'celebrate' | 'hop' | 'rise' | 'collapse';

/** Une demande de reaction. */
export type CortiReaction = { kind: CortiReactionKind; id: number };

let ticket = 0;
/**
 * Demander une reaction.
 *
 * L'identifiant compte : c'est LUI qui declenche, pas le genre. Sans lui,
 * bloquer deux reels d'affilee ne rejouerait rien du tout — la valeur n'aurait
 * pas change.
 */
export function cortiReact(kind: CortiReactionKind): CortiReaction {
  ticket += 1;
  return { kind, id: ticket };
}

const FACE: Record<CortiExpression, { eyes: keyof typeof EYES; mouth: keyof typeof MOUTH }> = {
  auto: { eyes: 'open', mouth: 'smile' },
  neutre: { eyes: 'open', mouth: 'smile' },
  content: { eyes: 'happy', mouth: 'open' },
  rire: { eyes: 'happy', mouth: 'laugh' },
  surpris: { eyes: 'surprised', mouth: 'o' },
  clin: { eyes: 'wink', mouth: 'smirk' },
  somnolent: { eyes: 'sleepy', mouth: 'flat' },
  triste: { eyes: 'sad', mouth: 'frown' },
  determine: { eyes: 'determined', mouth: 'smirk' },
  /*
    Grands yeux OUVERTS et bouche ouverte.
    « Content » ferme les yeux en arcs de bonheur, ce qui est mignon mais
    fuyant : sur l'ecran ou il se presente, il faut qu'il REGARDE. C'est
    la seule combinaison qui sourit franchement sans detourner les yeux.
  */
  ravi: { eyes: 'open', mouth: 'open' },
};

/** Le repos par niveau : en veilleuse il est tasse, debout il est droit. */
const POSTURE = [
  { x: 1, y: 1 }, { x: 1.03, y: 0.94 }, { x: 1, y: 1 }, { x: 1, y: 1 },
];
/** L'amplitude du souffle. Elle change avec l'etat : on respire court quand
 *  on va mal, et large quand on va bien. */
const BREATH = [
  { x: 0.01, y: 0.03 }, { x: 0.012, y: 0.03 }, { x: 0.015, y: 0.04 }, { x: 0.01, y: 0.03 },
];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function CortiRig({
  level, size = 160, animated = true, expression = 'auto', pose = 'idle',
  reaction, arrive = false, onPress, style,
}: {
  level: CortiLevel;
  size?: number;
  /** Faux pour une capture ou un widget : le dessin doit etre immobile. */
  animated?: boolean;
  expression?: CortiExpression;
  pose?: CortiPose;
  /** Rejouee a chaque nouvel identifiant. Voir cortiReact. */
  reaction?: CortiReaction;
  /** Il ARRIVE : il tombe, s'ecrase et rebondit, au lieu d'apparaitre. */
  arrive?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { d } = useT();
  // Les calques n'existent que pour 1 a 3 ; le niveau 0 est une image unique.
  const lv = Math.max(level, 1) as 1 | 2 | 3;

  /*
    L'ancre commune : (0,5 ; 0,83), ses pieds.
    React Native met toujours l'origine au centre, donc chaque echelle et
    chaque rotation est encadree par deux translations. Sans ca, respirer le
    fait grandir par le bas ET par le haut — il flotte au lieu d'etre pose.
  */
  const anchor = (0.83 - 0.5) * size;

  const breathe = useSharedValue(0);
  const glow = useSharedValue(0);
  const twinkle = useSharedValue(0);
  const flicker = useSharedValue(0);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const lift = useSharedValue(0);
  const shake = useSharedValue(0);
  const spin = useSharedValue(0);
  const burst = useSharedValue(0);
  const wave = useSharedValue(0);

  const [blinking, setBlinking] = useState(false);
  const [face, setFace] = useState<{ eyes: keyof typeof EYES; mouth: keyof typeof MOUTH } | null>(null);
  const [armsOver, setArmsOver] = useState<keyof typeof ARMS | null>(null);

  const motion = animated;
  const asleep = pose === 'sleep';

  /* ---------- Les boucles de fond ---------- */

  useEffect(() => {
    if (!motion) return;
    const loop = (v: typeof breathe, ms: number) => {
      v.value = withRepeat(
        withTiming(1, { duration: ms, easing: Easing.inOut(Easing.ease) }), -1, true
      );
    };
    loop(breathe, level === 0 ? 1500 : 1700);
    loop(glow, 1700);
    loop(twinkle, asleep ? 1400 : 950);
    if (level === 0) loop(flicker, 900); else flicker.value = 0;
    if (pose === 'wave') loop(wave, 700); else wave.value = 0;
    return () => {
      [breathe, glow, twinkle, flicker, wave].forEach(cancelAnimation);
    };
  }, [motion, level, asleep, pose, breathe, glow, twinkle, flicker, wave]);

  // Le clignement : rare, court, et jamais quand il dort ou qu'il est au sol.
  useEffect(() => {
    if (!motion || level === 0 || asleep) return;
    let t: ReturnType<typeof setTimeout>;
    let off: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        setBlinking(true);
        off = setTimeout(() => { setBlinking(false); next(); }, 120);
      }, rnd(3000, 5500));
    };
    next();
    return () => { clearTimeout(t); clearTimeout(off); };
  }, [motion, level, asleep]);

  // Le regard qui glisse. Il revient au centre une fois sur deux : toujours de
  // biais, on dirait qu'il evite le regard.
  useEffect(() => {
    if (!motion || level === 0 || asleep) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        const mid = Math.random() < 0.5;
        const e = { duration: 500, easing: Easing.inOut(Easing.ease) };
        lookX.value = withTiming(mid ? 0 : rnd(-7, 7) * (size / 400), e);
        lookY.value = withTiming(mid ? 0 : rnd(-3, 3) * (size / 400), e);
        next();
      }, rnd(1800, 4500));
    };
    next();
    return () => clearTimeout(t);
  }, [motion, level, asleep, size, lookX, lookY]);

  /* ---------- Le saut, et ce qui s'en sert ---------- */

  const hop = useCallback(() => {
    // Ecrase, detend, monte, retombe, rebondit : la sequence du studio, au
    // dixieme pres. C'est l'ecart entre « ca bouge » et « c'est vivant ».
    sx.value = withSequence(
      withTiming(1.1, { duration: 160, easing: Easing.in(Easing.ease) }),
      withTiming(0.95, { duration: 260, easing: Easing.out(Easing.ease) }),
      withTiming(0.98, { duration: 240, easing: Easing.in(Easing.ease) }),
      withTiming(1.12, { duration: 100, easing: Easing.out(Easing.ease) }),
      withSpring(1, { damping: 9, stiffness: 190 })
    );
    sy.value = withSequence(
      withTiming(0.9, { duration: 160, easing: Easing.in(Easing.ease) }),
      withTiming(1.08, { duration: 260, easing: Easing.out(Easing.ease) }),
      withTiming(1.04, { duration: 240, easing: Easing.in(Easing.ease) }),
      withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) }),
      withSpring(1, { damping: 9, stiffness: 190 })
    );
    lift.value = withSequence(
      withTiming(0, { duration: 160 }),
      withTiming(34 * (size / 400), { duration: 260, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 240, easing: Easing.in(Easing.ease) })
    );
  }, [sx, sy, lift, size]);

  // Rayonnant, il saute tout seul — c'est ce qui rend le niveau 3 desirable.
  useEffect(() => {
    if (!motion || level !== 3 || asleep || pose === 'sit') return;
    let t: ReturnType<typeof setTimeout>;
    const next = (first = false) => {
      t = setTimeout(() => { hop(); next(); }, first ? 900 : rnd(1400, 3000) + 900);
    };
    next(true);
    return () => clearTimeout(t);
  }, [motion, level, asleep, pose, hop]);

  /* ---------- Les reactions ---------- */

  const played = useRef<number | null>(null);
  const clear = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => { clear.current.push(setTimeout(fn, ms)); };

  useEffect(() => () => clear.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!reaction || !motion || played.current === reaction.id) return;
    played.current = reaction.id;
    /*
      La precedente est ANNULEE avant que celle-ci commence.

      Chaque reaction pose des minuteurs qui lui rendent son visage et ses bras
      a la fin. Enchainees — deux reels bloques coup sur coup — les minuteurs
      de la premiere tombaient au milieu de la seconde et la remettaient a
      zero : Corti reprenait son air neutre en plein « non » de la tete. La
      liste est aussi videe, sinon elle grossit a chaque reaction pour la
      duree de vie de l'ecran.
    */
    clear.current.forEach(clearTimeout);
    clear.current = [];
    const k = size / 400;

    switch (reaction.kind) {
      case 'hop':
        hop();
        break;

      case 'tap':
        sx.value = withSequence(
          withTiming(1.14, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 220 }));
        sy.value = withSequence(
          withTiming(0.86, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 220 }));
        shake.value = withSequence(
          withTiming(5, { duration: 100 }), withTiming(-5, { duration: 100 }),
          withTiming(5, { duration: 100 }), withTiming(0, { duration: 150 }));
        break;

      /*
        Le refus. C'est la reaction qui compte le plus : elle se joue quand un
        reel vient d'etre bloque. Il se campe, prend un air decide et fait NON
        de la tete. Un blocage silencieux se lit comme une panne ; un blocage
        que quelqu'un assume se lit comme une protection.
      */
      case 'no':
        setFace({ eyes: 'determined', mouth: 'flat' });
        setArmsOver('out');
        spin.value = withSequence(
          withTiming(22, { duration: 130 }), withTiming(-22, { duration: 130 }),
          withTiming(22, { duration: 130 }), withTiming(-22, { duration: 130 }),
          withTiming(0, { duration: 200 }));
        later(870, () => { setFace(null); setArmsOver(null); });
        break;

      case 'wave':
        setFace({ eyes: 'open', mouth: 'smile' });
        setArmsOver('wave');
        shake.value = withSequence(
          withTiming(-4, { duration: 180 }), withTiming(3, { duration: 180 }),
          withTiming(-4, { duration: 180 }), withTiming(3, { duration: 180 }),
          withTiming(0, { duration: 200 }));
        later(920, () => { setFace(null); setArmsOver(null); });
        break;

      case 'celebrate':
        setFace({ eyes: 'happy', mouth: 'open' });
        setArmsOver('up');
        burst.value = withTiming(1, { duration: 200 });
        sx.value = withSequence(
          withTiming(1.14, { duration: 140 }), withTiming(0.94, { duration: 300 }),
          withTiming(1, { duration: 280 }), withTiming(1.16, { duration: 100 }),
          withSpring(1, { damping: 8, stiffness: 170 }));
        sy.value = withSequence(
          withTiming(0.86, { duration: 140 }), withTiming(1.1, { duration: 300 }),
          withTiming(1, { duration: 280 }), withTiming(0.84, { duration: 100 }),
          withSpring(1, { damping: 8, stiffness: 170 }));
        lift.value = withSequence(
          withTiming(0, { duration: 140 }),
          withTiming(46 * k, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 280, easing: Easing.in(Easing.ease) }));
        spin.value = withSequence(
          withTiming(360, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 0 }));
        later(1600, () => {
          burst.value = withTiming(0, { duration: 300 });
          setFace(null); setArmsOver(null);
        });
        break;

      case 'rise':
        sx.value = withSequence(
          withTiming(0.93, { duration: 300 }), withSpring(1, { damping: 10, stiffness: 150 }));
        sy.value = withSequence(
          withTiming(1.12, { duration: 300 }), withSpring(1, { damping: 10, stiffness: 150 }));
        break;

      case 'collapse':
        sx.value = withSequence(
          withTiming(1.06, { duration: 250 }), withSpring(1, { damping: 13, stiffness: 120 }));
        sy.value = withSequence(
          withTiming(0.9, { duration: 250 }), withSpring(1, { damping: 13, stiffness: 120 }));
        break;
    }
  }, [reaction, motion, size, hop, sx, sy, lift, shake, spin, burst]);

  // L'arrivee : il TOMBE dans l'ecran. Apparaitre en fondu comme le reste de
  // la page en fait une illustration ; entrer en sautant en fait quelqu'un.
  useEffect(() => {
    if (!arrive || !motion) return;
    const k = size / 400;
    lift.value = withSequence(
      withTiming(64 * k, { duration: 0 }),
      withTiming(0, { duration: 340, easing: Easing.in(Easing.quad) }),
      withTiming(14 * k, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) })
    );
    sx.value = withDelay(340, withSequence(
      withTiming(1.12, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 200 })));
    sy.value = withDelay(340, withSequence(
      withTiming(0.88, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 200 })));
  }, [arrive, motion, size, lift, sx, sy]);

  /* ---------- Ce qu'on donne a voir ---------- */

  const eyes = face?.eyes
    ?? (asleep || blinking ? 'blink'
      : expression === 'auto' ? (level === 1 ? 'sleepy' : 'open')
        : FACE[expression].eyes);
  const mouth = face?.mouth
    ?? (asleep ? 'flat'
      : expression === 'auto' ? (level === 1 ? 'flat' : 'smile')
        : FACE[expression].mouth);
  const arms = armsOver
    ?? (pose === 'wave' ? 'wave' : pose === 'up' ? 'up' : pose === 'float' ? 'out' : 'down');

  const st = useMemo(() => sheet(size), [size]);

  /* Les trois etages de transformation, chacun avec son ancre. Les empiler en
     vues distinctes evite de jongler avec trois origines dans une seule liste. */
  const liftStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateY: -lift.value },
      { rotateY: `${spin.value}deg` },
    ],
  }));
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: anchor },
      { rotateZ: `${shake.value}deg` },
      { translateY: -anchor },
    ],
  }));
  const bodyStyle = useAnimatedStyle(() => {
    const p = POSTURE[level];
    const b = BREATH[level];
    return {
      transform: [
        { translateY: anchor },
        { scaleX: sx.value * (p.x + breathe.value * b.x) },
        { scaleY: sy.value * (p.y + breathe.value * b.y) },
        { translateY: -anchor },
      ],
    };
  });
  const auraStyle = useAnimatedStyle(() => ({
    opacity: asleep ? 0.5 : 1,
    transform: [{ scale: 1 + glow.value * 0.06 }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, lift.value / (40 * (size / 400))) * 0.6,
    transform: [{ scaleX: sx.value }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + twinkle.value * 0.55,
    transform: [{ scale: (0.9 + twinkle.value * 0.16) * (1 + burst.value * 0.35) }],
  }));
  const zzzStyle = useAnimatedStyle(() => ({ opacity: 0.4 + twinkle.value * 0.6 }));
  const lookStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lookX.value }, { translateY: lookY.value }],
  }));
  const waveStyle = useAnimatedStyle(() => {
    // Le bras pivote autour de l'epaule, pas du centre de l'image.
    const ax = (0.78 - 0.5) * size;
    const ay = (0.62 - 0.5) * size;
    return {
      transform: [
        { translateX: ax }, { translateY: ay },
        { rotateZ: `${(wave.value - 0.5) * 12}deg` },
        { translateX: -ax }, { translateY: -ay },
      ],
    };
  });
  // Au sol : il souffle, penche un peu, et sa lumiere vacille.
  const flatStyle = useAnimatedStyle(() => ({
    opacity: 1 - flicker.value * 0.45,
    transform: [
      { translateY: anchor * 1.05 },
      { scaleX: 1 + breathe.value * 0.02 },
      { scaleY: 1 - breathe.value * 0.03 },
      { rotateZ: `${-0.4 + breathe.value}deg` },
      { translateY: -anchor * 1.05 },
      { scaleX: sx.value }, { scaleY: sy.value },
    ],
  }));

  const Layer = ({ src }: { src: number }) => (
    <Image source={src} style={st.layer} contentFit="contain" cachePolicy="memory-disk" />
  );

  const scene = level === 0 ? (
    <Animated.View style={[st.layer, flatStyle]}>
      <Layer src={FLAT} />
    </Animated.View>
  ) : (
    <>
      <Animated.View style={[st.layer, auraStyle]}><Layer src={AURA[lv]} /></Animated.View>

      {pose !== 'float' && pose !== 'sit' && (
        <Animated.View style={[st.layer, shadowStyle]}><Layer src={SHADOW} /></Animated.View>
      )}

      <Animated.View style={[st.layer, liftStyle]}>
        <Animated.View style={[st.layer, shakeStyle]}>
          <Animated.View style={[st.layer, bodyStyle]}>
            {pose !== 'sit' && pose !== 'float' && <Layer src={FEET[lv]} />}
            <Animated.View style={[st.layer, arms === 'wave' ? waveStyle : undefined]}>
              <Layer src={ARMS[arms][lv]} />
            </Animated.View>
            <Layer src={BODY[lv]} />
            <Layer src={BLUSH} />
            {/* Les yeux et la bouche glissent ENSEMBLE : separes, le regard
                et le sourire partent chacun de leur cote. */}
            <Animated.View style={[st.layer, lookStyle]}>
              <Layer src={EYES[eyes]} />
              <Layer src={MOUTH[mouth]} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {asleep && (
        <Animated.View style={[st.layer, zzzStyle]}><Layer src={ZZZ} /></Animated.View>
      )}
      {level === 1 && pose === 'idle' && <Layer src={ICE} />}
      {level >= 2 && !asleep && (
        <Animated.View style={[st.layer, sparkleStyle]}><Layer src={SPARKLES} /></Animated.View>
      )}
    </>
  );

  const box = (
    <View style={[st.root, style]} accessibilityLabel={d.corti.rigAlt} accessible>
      {scene}
    </View>
  );

  return onPress ? <Pressable onPress={onPress}>{box}</Pressable> : box;
}

const sheet = (size: number) => StyleSheet.create({
  // Toujours un CARRE : le brief du studio l'exige, et les calques ne se
  // superposent qu'a cadre egal.
  root: { width: size, height: size },
  layer: { position: 'absolute', top: 0, left: 0, width: size, height: size },
});
