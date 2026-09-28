import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop,
} from 'react-native-svg';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence,
  withSpring, withTiming,
} from 'react-native-reanimated';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { dict, interpolate } from '@/i18n';
import { Text } from './type/Text';

/*
 * Corti, la mascotte : un petit cerveau qui s'eteint quand on scrolle et se
 * rallume a chaque jour sans reels.
 *
 * Il est DESSINE, pas pose en image : c'est la seule facon de lui faire fermer
 * les yeux, et fermer les yeux n'est pas un ornement ici — c'est ce qui donne
 * envie de revenir voir comment il va.
 *
 * Tout vient du dessin v2 du studio : la silhouette bosselee a douze lobes, les
 * circonvolutions, les quatre palettes, les poses. Y compris ce qu'on
 * n'inventerait pas — au niveau zero il n'est pas seulement gris, il est
 * ECRASE, large et bas, comme quelqu'un qui s'affaisse. C'est ce detail qui
 * fait qu'on le plaint avant d'avoir lu une ligne.
 *
 * Une seule adaptation : l'aura du dessin est un flou gaussien, que
 * react-native-svg ne rend pas de facon fiable. Elle est approchee par un
 * degrade radial, ce que faisaient deja les images livrees.
 *
 * Rien de ce qui bouge n'est une COULEUR : cette app tombe des qu'on anime une
 * propriete de couleur. Tout passe par une echelle, une opacite, un deplacement.
 */

export type CortiLevel = 0 | 1 | 2 | 3;

/** Le cote du repere de dessin. Toutes les coordonnees y sont exprimees. */
const VB = 200;

/**
 * Le niveau, d'apres les jours sans reels.
 *
 * Les seuils viennent du brief : 0 le premier jour, veilleuse jusqu'a six,
 * allume jusqu'a vingt-neuf, rayonnant a partir de trente. On LIT la serie, on
 * ne la calcule pas.
 */
export function cortiLevel(days: number): CortiLevel {
  if (!Number.isFinite(days) || days <= 0) return 0;
  if (days < 7) return 1;
  if (days < 30) return 2;
  return 3;
}

/**
 * Ce que Corti dit de son etat.
 *
 * Ce n'est pas un composant : il est appele depuis des listes et des en-tetes,
 * donc il lit le dictionnaire directement plutot que par un hook.
 */
export function cortiLine(level: CortiLevel, days: number): string {
  const key = (['says0', 'says1', 'says2', 'says3'] as const)[level];
  return interpolate(dict.corti[key], { n: days, s: days > 1 ? 's' : '' });
}

function levelName(level: CortiLevel): string {
  return [dict.corti.off, dict.corti.dim, dict.corti.lit, dict.corti.bright][level];
}

/* ---------- Les formes, reprises du dessin v2 ---------- */

/** La silhouette : douze lobes, comme un vrai cortex. */
const BODY =
  'M100.0 46.0Q114.4 36.0 125.3 49.5Q141.5 43.7 147.6 59.6Q164.2 58.7 164.1 75.0'
  + 'Q180.4 79.1 172.9 93.9Q189.5 117.8 164.1 133.0Q155.8 161.0 125.3 158.5'
  + 'Q100.0 172.0 74.7 158.5Q44.2 161.0 35.9 133.0Q10.5 117.8 27.1 93.9'
  + 'Q19.6 79.1 35.9 75.0Q35.8 58.7 52.4 59.6Q58.5 43.7 74.7 49.5Q85.6 36.0 100.0 46.0Z';

/** Les circonvolutions : une ligne centrale et six boucles. */
const GYRI =
  'M100 47c-4 12 4 24 0 36'
  + 'M58 72c6-12 20-12 26-2c-4 4-6 8-4 12'
  + 'M142 72c-6-12-20-12-26-2c4 4 6 8 4 12'
  + 'M38 98c4-14 18-16 28-6'
  + 'M162 98c-4-14-18-16-28-6'
  + 'M30 122c6-6 14-6 20 0'
  + 'M170 122c-6-6-14-6-20 0';

/** Les bras : le long du corps, ou leves quand il rayonne. */
const ARM_L = 'M40 126c-10 2-12 12-4 16';
const ARM_R = 'M160 126c10 2 12 12 4 16';
const ARM_UP_L = 'M34 112c-18-4-26-20-14-34';
const ARM_UP_R = 'M166 112c18-4 26-20 14-34';

/** Les visages. */
const EYES_SHUT = 'M65 118h22M113 118h22';
const EYES_HAPPY = 'M64 120q12-12 24 0M112 120q12-12 24 0';
const MOUTH_SAD = 'M94 140q6-4 12 0';
const MOUTH_SOFT = 'M94 137q6 6 12 0';
const MOUTH_OPEN = 'M88 134q12 14 24 0z';

/** Les zigzags de fatigue, au niveau zero. */
const TIRED = 'M22 54l8 6-6 5 8 6M178 44l-8 6 6 5-8 6';

/* ---------- Les couleurs, par niveau ---------- */

type Pal = {
  /** Deux ou trois arrets du degrade du corps. */
  body: string[];
  /** L'ombre portee au bas du corps : elle donne le volume. */
  shade: string;
  rim: string; rimOp: number;
  gyri: string; limb: string; foot: string; dim: string;
  aura: number; blush: number;
};

const PALETTES: Pal[] = [
  {
    body: ['#6B7286', '#2C3140'], shade: '#0B0D14',
    rim: '#8B93A6', rimOp: 0.5,
    gyri: '#3E4455', limb: '#4A5063', foot: '#3E4455', dim: '#6B7386',
    aura: 0, blush: 0,
  },
  {
    body: ['#C9DCF5', '#7FA6DE', '#4A7CC4'], shade: '#2F63C9',
    rim: '#FFFFFF', rimOp: 0.5,
    gyri: '#3A6BC4', limb: '#6A97D6', foot: '#4A7CC4', dim: '#7F9CC9',
    aura: 0.22, blush: 0.45,
  },
  {
    body: ['#EAF3FF', '#9CC6FF', '#5B9DFF'], shade: '#2F63C9',
    rim: '#FFFFFF', rimOp: 0.75,
    gyri: '#3F79E6', limb: '#7FB3FF', foot: '#5B9DFF', dim: '#FFFFFF',
    aura: 0.55, blush: 0.6,
  },
  {
    body: ['#F6FAFF', '#B7DAFF', '#7FB3FF'], shade: '#2F63C9',
    rim: '#FFFFFF', rimOp: 0.85,
    gyri: '#4C86F0', limb: '#9CC6FF', foot: '#7FB3FF', dim: '#FFFFFF',
    aura: 0.85, blush: 0.65,
  },
];

const GLOW = '#5B9DFF';
const EYE = '#0B1220';
const BLUSH = '#FFB3D9';

/** Les points, avec le niveau a partir duquel ils s'allument. */
const DOTS: { x: number; y: number; r: number; from: number; delay: number }[] = [
  { x: 64, y: 60, r: 2.8, from: 1, delay: 0 },
  { x: 136, y: 60, r: 2.8, from: 2, delay: 500 },
  { x: 44, y: 100, r: 2.4, from: 2, delay: 1000 },
  { x: 156, y: 100, r: 2.4, from: 2, delay: 1500 },
];

/** Les etincelles, aux deux niveaux hauts. Coordonnees du dessin. */
const SPARKS: Record<number, { x: number; y: number; r: number; c: string; delay: number }[]> = {
  2: [
    { x: 24, y: 44, r: 10, c: '#FFFFFF', delay: 0 },
    { x: 176, y: 40, r: 8, c: '#B7DAFF', delay: 600 },
    { x: 188, y: 92, r: 6, c: '#FFFFFF', delay: 1200 },
  ],
  3: [
    { x: 22, y: 30, r: 10, c: '#FFFFFF', delay: 0 },
    { x: 178, y: 30, r: 10, c: '#B7DAFF', delay: 600 },
    { x: 100, y: 20, r: 7, c: '#FFFFFF', delay: 1200 },
  ],
};

/**
 * La pose, par niveau.
 *
 * C'est le detail du dessin v2 qu'on n'inventerait pas : au niveau zero Corti
 * n'est pas seulement gris, il est ECRASE — large et bas, affaisse sur ses
 * pieds. Il se redresse par paliers, et ne retrouve sa taille pleine qu'au
 * niveau allume.
 */
const POSE: { x: [number, number]; y: [number, number]; ms: number }[] = [
  { x: [1.14, 1.17], y: [0.72, 0.69], ms: 3000 },   // affaisse
  { x: [1.05, 1.07], y: [0.90, 0.93], ms: 3200 },   // au repos
  { x: [1.00, 1.02], y: [1.00, 1.04], ms: 3400 },   // il respire
  { x: [1.00, 1.02], y: [1.00, 1.04], ms: 3400 },   // idem, plus le saut
];

/* ---------- La mascotte ---------- */

export function Corti({
  level, size = 132, animated = true, onPress, style,
}: {
  level: CortiLevel;
  size?: number;
  /** Faux pour une capture ou une vignette : le dessin doit etre immobile. */
  animated?: boolean;
  /** Le rend touchable. Sans ca, il rebondit quand meme quand on le touche. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const motion = animated && !reduced;
  const pal = PALETTES[level];
  const pose = POSE[level];
  const k = size / VB;

  const breath = useSharedValue(0);
  const halo = useSharedValue(0);
  const blink = useSharedValue(0);
  const hop = useSharedValue(0);
  const flick = useSharedValue(0);
  const hit = useSharedValue(0);
  const gaze = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eyeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!motion) {
      breath.value = 0; halo.value = 0; hop.value = 0; flick.value = 0;
      return;
    }
    // La respiration prend la duree de SA pose : affaisse, il est plus lent.
    breath.value = withRepeat(
      withTiming(1, { duration: pose.ms, easing: Easing.inOut(Easing.ease) }), -1, true
    );
    halo.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.ease) }), -1, true
    );
    // Le saut n'existe qu'au niveau rayonnant, le vacillement qu'au niveau
    // eteint : la difference entre quelqu'un qui exulte et quelqu'un qui cale.
    hop.value = level === 3
      ? withRepeat(withSpring(1, { damping: 10, stiffness: 150 }), -1, true)
      : withTiming(0, { duration: 200 });
    flick.value = level === 0
      ? withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, true)
      : withTiming(0, { duration: 200 });
  }, [motion, level, pose.ms, breath, halo, hop, flick]);

  /*
    Le clignement, toutes les 4,6 secondes — et seulement quand il a des yeux
    ronds. Eteint il dort deja, rayonnant il plisse les yeux.
  */
  const canBlink = level === 1 || level === 2;
  useEffect(() => {
    if (!motion || !canBlink) return;
    const tick = () => {
      blink.value = withSequence(
        withTiming(1, { duration: 60, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: 90, easing: Easing.out(Easing.quad) })
      );
      timer.current = setTimeout(tick, 4600);
    };
    timer.current = setTimeout(tick, 4600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [motion, canBlink, blink]);

  /*
    Le regard qui se promene : le clignement dit qu'il est vivant, le regard dit
    qu'il pense. L'intervalle est tire au hasard — un balayage regulier donnerait
    une camera de surveillance.
  */
  useEffect(() => {
    if (!motion || !canBlink) { gaze.value = 0; return; }
    const look = () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      gaze.value = withSequence(
        withTiming(side, { duration: 260, easing: Easing.out(Easing.quad) }),
        withDelay(900, withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) }))
      );
      eyeTimer.current = setTimeout(look, 3800 + Math.random() * 4200);
    };
    eyeTimer.current = setTimeout(look, 2400 + Math.random() * 2600);
    return () => { if (eyeTimer.current) clearTimeout(eyeTimer.current); };
  }, [motion, canBlink, gaze]);

  const poke = useCallback(() => {
    haptics.tap();
    hit.value = withSequence(
      withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(0, springs.snappy)
    );
    onPress?.();
  }, [hit, onPress]);

  /*
    Tout part du BAS. Un corps qui gonfle depuis son centre flotte ; un corps
    qui gonfle depuis ses pieds respire — et une mascotte affaissee doit
    s'affaisser SUR ses pieds, pas autour de son nombril.
  */
  const half = size / 2;
  const character = useAnimatedStyle(() => {
    const sx = pose.x[0] + breath.value * (pose.x[1] - pose.x[0]);
    const sy = pose.y[0] + breath.value * (pose.y[1] - pose.y[0]);
    return {
      opacity: 1 - flick.value * 0.6,
      transform: [
        { translateY: -hop.value * 14 * k - hit.value * size * 0.06 },
        { translateY: half },
        { scaleX: sx + hit.value * 0.03 },
        { scaleY: sy + hit.value * 0.03 },
        { translateY: -half },
      ],
    };
  });

  const aura = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + halo.value * 0.08 }],
  }));

  const eyes = useAnimatedStyle(() => ({
    transform: [
      { translateX: gaze.value * 3 * k },
      { scaleY: 1 - blink.value * 0.92 },
    ],
  }));

  const Root: React.ElementType = animated ? Pressable : View;
  const sparks = SPARKS[level] ?? [];
  const grad = `corti-body-${level}`;
  const shade = `corti-shade-${level}`;

  return (
    <Root
      style={[{ width: size, height: size }, style]}
      onPress={animated ? poke : undefined}
      accessibilityRole="image"
      accessibilityLabel={`Corti, ${levelName(level)}`}
    >
      {pal.aura > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, aura]} pointerEvents="none">
          <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
            <Defs>
              <RadialGradient id="corti-halo" cx="50%" cy="52%" r="50%">
                <Stop offset="0" stopColor={GLOW} stopOpacity={pal.aura} />
                <Stop offset="0.5" stopColor={GLOW} stopOpacity={pal.aura * 0.5} />
                <Stop offset="1" stopColor={GLOW} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={100} cy={104} rx={95} ry={86} fill="url(#corti-halo)" />
          </Svg>
        </Animated.View>
      )}

      {sparks.map((s) => (
        <Twinkle
          key={`s${s.x}-${s.y}`}
          x={s.x} y={s.y} r={s.r} colour={s.c} delay={s.delay}
          k={k} motion={motion} period={1900}
        />
      ))}

      <Animated.View style={[StyleSheet.absoluteFill, character]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
          <Defs>
            <RadialGradient id={grad} cx="38%" cy="30%" r="75%">
              {pal.body.map((colour, i) => (
                <Stop
                  key={colour}
                  offset={pal.body.length === 2 ? i : [0, 0.45, 1][i]}
                  stopColor={colour}
                />
              ))}
            </RadialGradient>
            {/* L'ombre au bas du corps : c'est elle qui lui donne du volume. */}
            <LinearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.55" stopColor={pal.shade} stopOpacity={0} />
              <Stop offset="1" stopColor={pal.shade} stopOpacity={0.45} />
            </LinearGradient>
          </Defs>

          {/* Les zigzags de fatigue, de part et d'autre de la tete. */}
          {level === 0 && (
            <Path
              d={TIRED}
              fill="none" stroke={pal.dim} strokeWidth={3}
              strokeLinecap="round" strokeLinejoin="round"
            />
          )}

          {/* Pieds et bras passent SOUS le corps. */}
          <Ellipse cx={82} cy={164} rx={12} ry={6} fill={pal.foot} />
          <Ellipse cx={118} cy={164} rx={12} ry={6} fill={pal.foot} />
          <Path
            d={level === 3 ? ARM_UP_L : ARM_L}
            fill="none" stroke={pal.limb} strokeWidth={9} strokeLinecap="round"
          />
          <Path
            d={level === 3 ? ARM_UP_R : ARM_R}
            fill="none" stroke={pal.limb} strokeWidth={9} strokeLinecap="round"
          />

          <Path
            d={BODY}
            fill={`url(#${grad})`}
            stroke={pal.rim} strokeOpacity={pal.rimOp}
            strokeWidth={2.5} strokeLinejoin="round"
          />
          <Path d={BODY} fill={`url(#${shade})`} />

          <Path
            d={GYRI}
            fill="none" stroke={pal.gyri} strokeOpacity={0.55}
            strokeWidth={3.5} strokeLinecap="round"
          />

          {/* Les points eteints. Ceux qui s'allument sont poses par-dessus. */}
          {DOTS.filter((dt) => level < dt.from).map((dt) => (
            <Circle key={`o${dt.x}`} cx={dt.x} cy={dt.y} r={dt.r} fill={pal.dim} />
          ))}

          {/* La poche de glace sur le front, au niveau veilleuse. */}
          {level === 1 && (
            <G transform="rotate(-18 144 60)">
              <Ellipse
                cx={144} cy={62} rx={17} ry={10}
                fill="#D6EAFF" stroke="#FFFFFF" strokeWidth={2}
              />
            </G>
          )}

          {pal.blush > 0 && (
            <>
              <Ellipse cx={58} cy={134} rx={9} ry={5.5} fill={BLUSH} opacity={pal.blush} />
              <Ellipse cx={142} cy={134} rx={9} ry={5.5} fill={BLUSH} opacity={pal.blush} />
            </>
          )}

          {level === 0 && (
            <Path d={EYES_SHUT} fill="none" stroke={EYE} strokeWidth={4.5} strokeLinecap="round" />
          )}
          {level === 3 && (
            <Path d={EYES_HAPPY} fill="none" stroke={EYE} strokeWidth={4} strokeLinecap="round" />
          )}

          {level === 3 ? (
            <>
              <Path d={MOUTH_OPEN} fill={EYE} />
              <Ellipse cx={100} cy={138} rx={5} ry={2.5} fill={BLUSH} />
            </>
          ) : (
            <Path
              d={level === 0 ? MOUTH_SAD : MOUTH_SOFT}
              fill="none" stroke={EYE} strokeWidth={3} strokeLinecap="round"
            />
          )}
        </Svg>

        {DOTS.filter((dt) => level >= dt.from).map((dt) => (
          <Twinkle
            key={`d${dt.x}`}
            x={dt.x} y={dt.y}
            r={level === 3 ? dt.r + 0.4 : dt.r}
            colour="#FFFFFF" delay={dt.delay}
            k={k} motion={motion} period={2200} round
          />
        ))}

        {/* Les yeux ronds, dans leur propre bande pour pouvoir se fermer. */}
        {canBlink && (
          <Animated.View
            style={[
              { position: 'absolute', left: 0, width: size, top: 98 * k, height: 40 * k },
              eyes,
            ]}
            pointerEvents="none"
          >
            <Svg width={size} height={40 * k} viewBox={`0 0 ${VB} 40`}>
              <Circle cx={76} cy={20} r={12.5} fill={EYE} />
              <Circle cx={124} cy={20} r={12.5} fill={EYE} />
              <Circle cx={71.5} cy={15.5} r={4.2} fill="#FFFFFF" />
              <Circle cx={119.5} cy={15.5} r={4.2} fill="#FFFFFF" />
              <Circle cx={80.5} cy={24.5} r={1.8} fill="#FFFFFF" />
              <Circle cx={128.5} cy={24.5} r={1.8} fill="#FFFFFF" />
            </Svg>
          </Animated.View>
        )}
      </Animated.View>
    </Root>
  );
}

/**
 * Un point ou une etincelle qui scintille.
 *
 * Chacun a son propre retard : allumes ensemble, quatre points font un
 * clignotant ; decales, ils font une pensee qui circule.
 */
function Twinkle({
  x, y, r, colour, delay, k, motion, period, round = false,
}: {
  x: number; y: number; r: number; colour: string; delay: number;
  k: number; motion: boolean; period: number; round?: boolean;
}) {
  const on = useSharedValue(motion ? 0 : 1);

  useEffect(() => {
    if (!motion) { on.value = 1; return; }
    on.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: period, easing: Easing.inOut(Easing.ease) }), -1, true
      )
    );
  }, [motion, delay, period, on]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + on.value * 0.75,
    transform: [{ scale: 0.6 + on.value * 0.55 }],
  }));

  const box = r * 2 * k;
  // L'etincelle a quatre branches, dans un carre de cote 2r.
  const d = useMemo(
    () => `M${r},0 Q${r},${r} ${r * 2},${r} Q${r},${r} ${r},${r * 2} `
      + `Q${r},${r} 0,${r} Q${r},${r} ${r},0 Z`,
    [r]
  );

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x * k - box / 2,
          top: y * k - box / 2,
          width: box,
          height: box,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width={box} height={box} viewBox={`0 0 ${r * 2} ${r * 2}`}>
        {round
          ? <Circle cx={r} cy={r} r={r} fill={colour} />
          : <Path d={d} fill={colour} />}
      </Svg>
    </Animated.View>
  );
}

/* ---------- Corti prend la parole ---------- */

/**
 * Corti, et ce qu'il dit.
 *
 * Le parcours parle du cerveau de la personne a la troisieme personne : « ta
 * memoire flanche ». C'est une affirmation, et une affirmation sur soi se
 * discute. La meme phrase dite PAR le cerveau ne se discute plus : ce n'est
 * plus un diagnostic qu'on vous pose, c'est quelqu'un qui vous dit comment il
 * va. Et comme ce quelqu'un est vous, on ne peut pas lui en vouloir.
 */
export function CortiSays({
  level, text, size = 84, align = 'row',
}: {
  level: CortiLevel;
  text: string;
  size?: number;
  /** En ligne pour un aparte, en colonne quand c'est lui qui porte l'ecran. */
  align?: 'row' | 'column';
}) {
  const column = align === 'column';
  return (
    <View style={[says.root, column && says.col]}>
      <Corti level={level} size={size} />
      <View style={[says.bubble, column ? says.bubbleDown : says.bubbleSide]}>
        {/* La pointe est un carre tourne, a cheval sur le bord : un triangle
            dessine demanderait un SVG de plus pour trois pixels. */}
        <View style={[says.tail, column ? says.tailUp : says.tailLeft]} />
        {/* Son nom au-dessus de ce qu'il dit. Sans lui, la bulle se lit comme
            une phrase de plus de l'ecran, et on ne sait plus qui parle. */}
        <Text variant="label" style={says.who}>CORTI</Text>
        <Text variant="body" style={says.text}>{text}</Text>
      </View>
    </View>
  );
}

const SKIN = '#B7DAFF';
const SKIN_BG = '#B7DAFF16';

const says = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  col: { flexDirection: 'column', gap: 14 },
  bubble: {
    flex: 1,
    paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth, borderColor: SKIN + '55',
    backgroundColor: SKIN_BG,
  },
  bubbleSide: { marginLeft: 4 },
  bubbleDown: { alignSelf: 'stretch', flex: 0 },
  tail: {
    position: 'absolute', width: 12, height: 12,
    transform: [{ rotate: '45deg' }],
    borderColor: SKIN + '55', backgroundColor: SKIN_BG,
  },
  tailLeft: {
    left: -6, top: '50%', marginTop: -6,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tailUp: {
    top: -6, alignSelf: 'center', left: '50%', marginLeft: -6,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  who: { color: SKIN + 'A0', fontSize: 8, marginBottom: 3 },
  text: { color: SKIN },
});
