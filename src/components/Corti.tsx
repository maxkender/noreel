import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
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
 * Elle est DESSINEE, pas posee en image. Le studio l'a livree en SwiftUI
 * natif — des formes vectorielles et six boucles d'animation — plus un jeu de
 * PNG qui n'en sont que des captures. Cette app etant en React Native, la
 * tentation etait de prendre les PNG : on y perd exactement ce qui fait la
 * mascotte. Un dessin fige ne cligne pas des yeux, et cligner des yeux n'est
 * pas un ornement ici — c'est ce qui donne envie de revenir voir comment elle
 * va.
 *
 * L'espace de dessin est le sien : 200 x 200, comme dans le fichier d'origine,
 * pour que chaque coordonnee soit reprise telle quelle et reste comparable.
 *
 * Rien de ce qui bouge n'est une COULEUR : cette app tombe des qu'on anime une
 * propriete de couleur. Tout passe par une echelle, une opacite ou un
 * deplacement.
 */

export type CortiLevel = 0 | 1 | 2 | 3;

/** Le cote du repere de dessin. Toutes les coordonnees y sont exprimees. */
const VB = 200;

/**
 * Le niveau, d'apres les jours sans reels.
 *
 * Les seuils viennent du brief et n'ont pas ete choisis ici : 0 le premier
 * jour, veilleuse jusqu'a six, allume jusqu'a vingt-neuf, rayonnant a partir
 * de trente. On LIT la serie, on ne la calcule pas.
 */
export function cortiLevel(days: number): CortiLevel {
  if (!Number.isFinite(days) || days <= 0) return 0;
  if (days < 7) return 1;
  if (days < 30) return 2;
  return 3;
}

/**
 * Ce que Corti dit de son etat, selon son niveau.
 *
 * Ce n'est pas un composant : elle est appelee depuis des listes et des
 * en-tetes, donc elle lit le dictionnaire directement plutot que par un hook.
 */
export function cortiLine(level: CortiLevel, days: number): string {
  const key = (['says0', 'says1', 'says2', 'says3'] as const)[level];
  return interpolate(dict.corti[key], { n: days, s: days > 1 ? 's' : '' });
}

/** Le nom du niveau, pour VoiceOver. */
function levelName(level: CortiLevel): string {
  return [dict.corti.off, dict.corti.dim, dict.corti.lit, dict.corti.bright][level];
}

/* ---------- Les formes, reprises du dessin d'origine ---------- */

/** La silhouette : deux lobes ronds et une fente en coeur au sommet. */
const BODY =
  'M100,60 C92,48 72,42 60,46 C44,50 30,72 32,100 C34,134 66,158 100,158 '
  + 'C134,158 166,134 168,100 C170,72 156,50 140,46 C128,42 108,48 100,60 Z';

/** Les circonvolutions. */
const GYRI =
  'M100,60 C97,70 103,80 100,90 M52,76 C60,64 74,62 84,70 '
  + 'M148,76 C140,64 126,62 116,70';

/** Les bras : leves quand elle rayonne, le long du corps sinon. */
const ARMS_UP = 'M40,116 C24,114 16,100 26,86 M160,116 C176,114 184,100 174,86';
const ARMS_DOWN = 'M44,124 C34,126 32,136 40,140 M156,124 C166,126 168,136 160,140';

/** La bouche, par niveau : tombante, timide, puis franche. */
const MOUTH = [
  'M94,137 Q100,133 106,137',
  'M94,135 Q100,138 106,135',
  'M94,134 Q100,140 106,134',
  'M94,134 Q100,140 106,134',
];

/** Les yeux fermes du niveau zero. */
const SLEEPY = 'M65,114 L87,114 M113,114 L135,114';

/** Le visage heureux du niveau trois : yeux plisses, bouche ouverte. */
const HAPPY_EYES = 'M64,116 Q76,104 88,116 M112,116 Q124,104 136,116';
const HAPPY_MOUTH = 'M88,130 Q100,144 112,130 Z';

/** L'etincelle a quatre branches, dans un carre de cote 2r. */
function sparklePath(r: number): string {
  return `M${r},0 Q${r},${r} ${r * 2},${r} Q${r},${r} ${r},${r * 2} `
    + `Q${r},${r} 0,${r} Q${r},${r} ${r},0 Z`;
}

/* ---------- Les couleurs, par niveau ---------- */

type Pal = {
  inner: string; mid: string; outer: string;
  rim: string; line: string; limb: string; dim: string;
  aura: number; blush: number;
};

const PALETTES: Pal[] = [
  {
    inner: '#6B7286', mid: '#4A5063', outer: '#2C3140',
    rim: '#8B93A699', line: '#8B93A699', limb: '#4A5063', dim: '#6B7386',
    aura: 0, blush: 0,
  },
  {
    inner: '#C9DCF5', mid: '#7FA6DE', outer: '#4A7CC4',
    rim: '#FFFFFF80', line: '#FFFFFF73', limb: '#6A97D6', dim: '#7F9CC9',
    aura: 0.22, blush: 0.45,
  },
  {
    inner: '#EAF3FF', mid: '#9CC6FF', outer: '#5B9DFF',
    rim: '#FFFFFFBF', line: '#FFFFFF99', limb: '#7FB3FF', dim: '#FFFFFF',
    aura: 0.55, blush: 0.6,
  },
  {
    inner: '#F6FAFF', mid: '#B7DAFF', outer: '#7FB3FF',
    rim: '#FFFFFFD9', line: '#FFFFFFB3', limb: '#9CC6FF', dim: '#FFFFFF',
    aura: 0.85, blush: 0.65,
  },
];

const GLOW = '#5B9DFF';
const ICE = '#B7DAFF';
const EYE = '#0B1220';
const BLUSH = '#FFB3D9';

/** Les points, avec le niveau a partir duquel ils s'allument. */
const DOTS: { x: number; y: number; r: number; from: number; delay: number }[] = [
  { x: 64, y: 60, r: 2.8, from: 1, delay: 0 },
  { x: 136, y: 60, r: 2.8, from: 2, delay: 500 },
  { x: 44, y: 100, r: 2.4, from: 2, delay: 1000 },
  { x: 156, y: 100, r: 2.4, from: 2, delay: 1500 },
];

/** Les etincelles, qui n'existent qu'aux deux niveaux hauts. */
const SPARKS: Record<number, { x: number; y: number; r: number; c: string; delay: number }[]> = {
  2: [
    { x: 24, y: 44, r: 10, c: '#FFFFFF', delay: 0 },
    { x: 176, y: 40, r: 8, c: ICE, delay: 600 },
    { x: 184, y: 104, r: 6, c: '#FFFFFF', delay: 1200 },
  ],
  3: [
    { x: 22, y: 30, r: 10, c: '#FFFFFF', delay: 0 },
    { x: 178, y: 30, r: 10, c: ICE, delay: 600 },
    { x: 100, y: 20, r: 7, c: '#FFFFFF', delay: 1200 },
  ],
};

/* ---------- La mascotte ---------- */

export function Corti({
  level, size = 132, animated = true, onPress, style,
}: {
  level: CortiLevel;
  size?: number;
  /** Faux pour une capture ou une vignette : le dessin doit etre immobile. */
  animated?: boolean;
  /** La rend touchable. Sans ca, elle rebondit quand meme quand on la touche. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const motion = animated && !reduced;
  const pal = PALETTES[level];
  // Un facteur unique : toutes les mesures sont donnees dans le repere 200.
  const k = size / VB;

  const breath = useSharedValue(0);
  const halo = useSharedValue(0);
  const blink = useSharedValue(0);
  const hop = useSharedValue(0);
  const flick = useSharedValue(0);
  const hit = useSharedValue(0);
  // Le regard : -1 a gauche, +1 a droite, 0 de face.
  const gaze = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eyeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!motion) {
      breath.value = 0; halo.value = 0; hop.value = 0; flick.value = 0;
      return;
    }
    // Respiration et lueur gardent la duree d'origine : 1,7 s.
    breath.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.ease) }), -1, true
    );
    halo.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.ease) }), -1, true
    );
    // Le saut n'existe qu'au niveau trois, le vacillement qu'au niveau zero :
    // c'est la difference entre quelqu'un qui exulte et quelqu'un qui s'eteint.
    hop.value = level === 3
      ? withRepeat(withSpring(1, { damping: 11, stiffness: 160 }), -1, true)
      : withTiming(0, { duration: 200 });
    flick.value = level === 0
      ? withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true)
      : withTiming(0, { duration: 200 });
  }, [motion, level, breath, halo, hop, flick]);

  /*
    Le clignement, toutes les 4,6 secondes.

    C'est le geste qui oblige a DESSINER Corti plutot qu'a l'afficher : les
    yeux se referment a 8 % de leur hauteur, autour d'une ligne posee sous leur
    centre. Avec une image, il aurait fallu ecraser toute la tete — ce qui se
    voit, et ce qui n'est pas un clignement.
  */
  useEffect(() => {
    if (!motion) return;
    const tick = () => {
      blink.value = withSequence(
        withTiming(1, { duration: 60, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: 90, easing: Easing.out(Easing.quad) })
      );
      timer.current = setTimeout(tick, 4600);
    };
    timer.current = setTimeout(tick, 4600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [motion, blink]);

  /*
    Le regard qui se promene.

    Le clignement dit qu'elle est vivante ; le regard dit qu'elle pense. Les
    pupilles glissent de trois unites d'un cote, tiennent une seconde, puis
    reviennent — et rien ne se passe pendant plusieurs secondes entre deux
    coups d'oeil. C'est l'irregularite qui fait l'effet : un balayage
    regulier donnerait une camera de surveillance.

    Ca ne coute qu'une translation sur la bande des yeux, deja dessinee a
    part pour le clignement.
  */
  useEffect(() => {
    if (!motion) { gaze.value = 0; return; }
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
  }, [motion, gaze]);

  const poke = useCallback(() => {
    haptics.tap();
    hit.value = withSequence(
      withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(0, springs.snappy)
    );
    onPress?.();
  }, [hit, onPress]);

  /*
    La respiration part du BAS : un corps qui gonfle depuis son centre flotte,
    un corps qui gonfle depuis ses pieds respire. On descend d'une demi-hauteur,
    on met a l'echelle, on remonte.
  */
  const half = size / 2;
  const character = useAnimatedStyle(() => ({
    opacity: 1 - flick.value * 0.45,
    transform: [
      { translateY: -hop.value * 12 * k - hit.value * size * 0.06 },
      { translateY: half },
      { scaleX: 1 + breath.value * 0.02 + hit.value * 0.03 },
      { scaleY: 1 + breath.value * 0.04 + hit.value * 0.03 },
      { translateY: -half },
    ],
  }));

  const aura = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + halo.value * 0.08 }],
  }));

  // Les yeux se referment dans leur propre bande, dont le centre EST la ligne
  // des yeux : l'echelle verticale suffit, sans rattrapage d'origine.
  const eyes = useAnimatedStyle(() => ({
    transform: [
      { translateX: gaze.value * 3 * k },
      { scaleY: 1 - blink.value * 0.92 },
    ],
  }));

  const Root: React.ElementType = animated ? Pressable : View;
  const sparks = SPARKS[level] ?? [];

  return (
    <Root
      style={[{ width: size, height: size }, style]}
      onPress={animated ? poke : undefined}
      accessibilityRole="image"
      accessibilityLabel={`Corti, ${levelName(level)}`}
    >
      {/* La lueur, derriere tout le reste. Elle n'existe pas au niveau zero. */}
      {pal.aura > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, aura]} pointerEvents="none">
          <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
            <RadialGradient id="corti-halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={GLOW} stopOpacity={pal.aura} />
              <Stop offset="0.55" stopColor={GLOW} stopOpacity={pal.aura * 0.55} />
              <Stop offset="1" stopColor={GLOW} stopOpacity={0} />
            </RadialGradient>
            <Ellipse cx={100} cy={104} rx={92} ry={83} fill="url(#corti-halo)" />
          </Svg>
        </Animated.View>
      )}

      {sparks.map((s) => (
        <Twinkle
          key={`s${s.x}-${s.y}`}
          x={s.x} y={s.y} r={s.r} colour={s.c} delay={s.delay}
          k={k} motion={motion} period={950}
        />
      ))}

      <Animated.View style={[StyleSheet.absoluteFill, character]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
          <RadialGradient id={`corti-body-${level}`} cx="38%" cy="30%" r="75%">
            <Stop offset="0" stopColor={pal.inner} />
            <Stop offset="0.45" stopColor={pal.mid} />
            <Stop offset="1" stopColor={pal.outer} />
          </RadialGradient>

          {/* Pieds et bras passent SOUS le corps. */}
          <Ellipse cx={82} cy={164} rx={12} ry={6} fill={pal.limb} />
          <Ellipse cx={118} cy={164} rx={12} ry={6} fill={pal.limb} />
          <Path
            d={level === 3 ? ARMS_UP : ARMS_DOWN}
            stroke={pal.limb} strokeWidth={9} strokeLinecap="round" fill="none"
          />

          <Path
            d={BODY}
            fill={`url(#corti-body-${level})`}
            stroke={pal.rim}
            strokeWidth={2.5}
          />
          <Path d={GYRI} stroke={pal.line} strokeWidth={3.5} strokeLinecap="round" fill="none" />

          {/* Les points eteints. Ceux qui s'allument sont poses par-dessus,
              pour scintiller chacun a son rythme. */}
          {DOTS.filter((dt) => level < dt.from).map((dt) => (
            <Circle key={`o${dt.x}`} cx={dt.x} cy={dt.y} r={dt.r} fill={pal.dim} />
          ))}

          {/* La poche de glace sur le front, au niveau veilleuse. */}
          {level === 1 && (
            <G transform="rotate(-18 144 62)">
              <Ellipse
                cx={144} cy={62} rx={17} ry={10}
                fill="#D6EAFF" stroke="#FFFFFF" strokeWidth={2}
              />
              <Rect x={138} y={48} width={12} height={7} rx={2} fill="#FFFFFF" />
            </G>
          )}

          {pal.blush > 0 && (
            <>
              <Ellipse cx={58} cy={132} rx={9} ry={5.5} fill={BLUSH} opacity={pal.blush} />
              <Ellipse cx={142} cy={132} rx={9} ry={5.5} fill={BLUSH} opacity={pal.blush} />
            </>
          )}

          {level === 0 && (
            <Path d={SLEEPY} stroke={EYE} strokeWidth={4.5} strokeLinecap="round" fill="none" />
          )}

          {level === 3 ? (
            <>
              <Path d={HAPPY_EYES} stroke={EYE} strokeWidth={4} strokeLinecap="round" fill="none" />
              <Path d={HAPPY_MOUTH} fill={EYE} />
              <Ellipse cx={100} cy={134} rx={5} ry={2.5} fill={BLUSH} />
            </>
          ) : (
            <Path d={MOUTH[level]} stroke={EYE} strokeWidth={3} strokeLinecap="round" fill="none" />
          )}
        </Svg>

        {DOTS.filter((dt) => level >= dt.from).map((dt) => (
          <Twinkle
            key={`d${dt.x}`}
            x={dt.x} y={dt.y} r={dt.r} colour="#FFFFFF" delay={dt.delay}
            k={k} motion={motion} period={1100} round
          />
        ))}

        {/*
          Les yeux ronds, dans leur propre bande pour pouvoir se fermer.
          Le niveau zero dort et le niveau trois plisse deja les yeux : ni l'un
          ni l'autre ne cligne, comme dans le dessin d'origine.
        */}
        {(level === 1 || level === 2) && (
          <Animated.View
            style={[
              { position: 'absolute', left: 0, width: size, top: 94 * k, height: 40 * k },
              eyes,
            ]}
            pointerEvents="none"
          >
            <Svg width={size} height={40 * k} viewBox={`0 0 ${VB} 40`}>
              <Circle cx={76} cy={20} r={13} fill={EYE} />
              <Circle cx={124} cy={20} r={13} fill={EYE} />
              <Circle cx={71} cy={15} r={4.5} fill="#FFFFFF" />
              <Circle cx={119} cy={15} r={4.5} fill="#FFFFFF" />
              <Circle cx={81} cy={25} r={2} fill="#FFFFFF" />
              <Circle cx={129} cy={25} r={2} fill="#FFFFFF" />
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

  // La boite fait deux fois le rayon, et se pose centree sur son point.
  const box = r * 2 * k;
  const d = useMemo(() => sparklePath(r), [r]);

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
 * memoire flanche », « ta dopamine sature ». Ce sont des affirmations, et une
 * affirmation sur soi se discute. Les memes phrases dites PAR le cerveau
 * lui-meme ne se discutent plus : ce n'est plus un diagnostic qu'on vous
 * pose, c'est quelqu'un qui vous dit comment il va. Et comme ce quelqu'un est
 * vous, on ne peut pas lui en vouloir.
 *
 * C'est aussi ce qui fait qu'on comprend l'app sans explication : on voit
 * Corti eteint avant de lire une seule statistique, et on a deja saisi.
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
        {/*
          La pointe de la bulle est un carre tourne, pose a cheval sur le bord.
          Un triangle dessine demanderait un SVG de plus pour trois pixels, et
          se decalerait des que le rayon du coin change.
        */}
        <View style={[says.tail, column ? says.tailUp : says.tailLeft]} />
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
  text: { color: SKIN },
});
