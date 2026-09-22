import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { haptics } from '@/lib/haptics';

const MARK = require('@/assets/brand/mark.png');
const WORD = require('@/assets/brand/wordmark.png');

const MARK_SIZE = 96;
/**
 * Le triangle pointe a gauche : son centre de masse est a 7,5 % de sa
 * largeur a DROITE du centre de sa boite (mesure dans le fichier). Centrer
 * la boite le faisait donc paraitre pousse vers la droite. On le recale.
 */
const MARK_NUDGE = -Math.round(MARK_SIZE * 0.075);

const WORD_H = 34;
const WORD_W = Math.round(WORD_H * (1024 / 255));  // ratio du fichier
const GAP = 12;
const SHIFT = (WORD_W + GAP) / 2;

/**
 * Fin de chaque lettre de « UnSwipe », en fraction de la largeur du mot.
 * Mesurees dans le fichier : les colonnes vides separent U, n, p et e ; S,
 * w et i se touchent, leurs bornes sont posees sur leurs largeurs reelles.
 */
const LETTERS = [0.164, 0.311, 0.455, 0.626, 0.705, 0.863, 1];
const KEY = 55;    // la lettre entre
const HOLD = 60;   // le temps entre deux frappes

const T = {
  hold: 220,     // noir pur
  fade: 720,     // la marque nait
  settle: 340,   // temps de pose
  slide: 620,    // elle glisse a gauche
  linger: 480,   // on laisse lire
  out: 700,      // le contenu s'efface — long, comme demande
  black: 640,    // puis le noir s'ouvre sur le premier ecran
};
const T_SLIDE = T.hold + T.fade + T.settle;
const T_WRITE = T_SLIDE + 240;
const WRITE = LETTERS.length * (KEY + HOLD);
const T_OUT = T_WRITE + WRITE + T.linger;
const T_BLACK = T_OUT + T.out;
const T_END = T_BLACK + T.black;

const SOFT = { damping: 20, stiffness: 110, mass: 1 };

/**
 * Le noir, la marque qui nait au centre optique, son glissement a gauche
 * pendant que « UnSwipe » se tape lettre par lettre, puis deux fondus longs
 * qui ouvrent sur le premier ecran.
 *
 * Les lettres sont celles du logo : le masque avance d'une borne de lettre
 * a la suivante, un curseur le suit.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const born = useSharedValue(0);
  const pop = useSharedValue(0.9);
  const slide = useSharedValue(1);
  const write = useSharedValue(0);
  const caret = useSharedValue(0);
  const out = useSharedValue(0);
  const black = useSharedValue(0);

  useEffect(() => {
    born.value = withDelay(T.hold, withTiming(1, {
      duration: T.fade, easing: Easing.bezier(0.22, 1, 0.36, 1),
    }));
    // Ressort plutot que courbe : l'echelle se pose au lieu de s'arreter.
    pop.value = withDelay(T.hold, withSpring(1, SOFT));
    slide.value = withDelay(T_SLIDE, withSpring(0, SOFT));

    // Une frappe par lettre : elle entre vite, puis on attend la suivante.
    const keys = LETTERS.flatMap((stop) => [
      withTiming(stop, { duration: KEY, easing: Easing.out(Easing.cubic) }),
      withTiming(stop, { duration: HOLD }),
    ]);
    write.value = withDelay(T_WRITE, withSequence(...keys));

    caret.value = withDelay(T_WRITE, withSequence(
      withTiming(1, { duration: 70 }),
      withTiming(1, { duration: WRITE }),
      withTiming(0, { duration: 320 })
    ));

    out.value = withDelay(T_OUT, withTiming(1, {
      duration: T.out, easing: Easing.inOut(Easing.quad),
    }));
    black.value = withDelay(T_BLACK, withTiming(1, {
      duration: T.black, easing: Easing.inOut(Easing.quad),
    }));

    const taps = LETTERS.map((_, i) =>
      setTimeout(() => haptics.tick(), T_WRITE + i * (KEY + HOLD))
    );
    const h1 = setTimeout(() => haptics.tap(), T.hold + T.fade * 0.6);
    const end = setTimeout(onDone, T_END);
    return () => { taps.forEach(clearTimeout); clearTimeout(h1); clearTimeout(end); };
  }, [born, pop, slide, write, caret, out, black, onDone]);

  const veil = useAnimatedStyle(() => ({ opacity: 1 - black.value }));
  const stage = useAnimatedStyle(() => ({
    opacity: 1 - out.value,
    transform: [{ translateX: slide.value * SHIFT }],
  }));
  const mark = useAnimatedStyle(() => ({
    opacity: born.value,
    transform: [{ translateX: MARK_NUDGE }, { scale: pop.value }],
  }));
  // Halo tres dilue derriere la marque : il donne de la profondeur au noir.
  const halo = useAnimatedStyle(() => ({
    opacity: born.value * 0.5 * (1 - out.value),
    transform: [{ translateX: MARK_NUDGE }, { scale: 0.9 + pop.value * 0.5 }],
  }));
  // Le masque s'elargit par bonds de lettre : jamais d'etirement du dessin.
  const mask = useAnimatedStyle(() => ({ width: write.value * WORD_W }));
  const bar = useAnimatedStyle(() => ({
    opacity: caret.value,
    transform: [{ translateX: write.value * WORD_W + 3 }],
  }));

  return (
    <Animated.View style={[styles.root, veil]} pointerEvents="none">
      <Animated.View style={[styles.stage, stage]}>
        <Animated.View style={styles.slot}>
          <Animated.View style={[styles.halo, halo]} />
          <Animated.View style={mark}>
            <Image source={MARK} style={styles.mark} contentFit="contain" />
          </Animated.View>
        </Animated.View>

        <Animated.View style={styles.word}>
          <Animated.View style={[styles.mask, mask]}>
            <Image source={WORD} style={styles.letters} contentFit="contain" />
          </Animated.View>
          <Animated.View style={[styles.caret, bar]} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.ground, alignItems: 'center', justifyContent: 'center',
    zIndex: 50,
  },
  stage: { flexDirection: 'row', alignItems: 'center' },
  slot: {
    width: MARK_SIZE, height: MARK_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  halo: {
    position: 'absolute', width: MARK_SIZE, height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2, backgroundColor: withAlpha(colors.accent, 0.3),
  },
  word: { width: WORD_W, height: WORD_H, marginLeft: GAP },
  mask: { height: WORD_H, overflow: 'hidden' },
  // Largeur fixe a l'interieur du masque : c'est le masque qui bouge.
  letters: { width: WORD_W, height: WORD_H },
  caret: {
    position: 'absolute', left: 0, top: 4, bottom: 4, width: 2.5,
    borderRadius: 2, backgroundColor: colors.accent,
  },
});
