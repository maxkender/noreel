import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { haptics } from '@/lib/haptics';

const MARK = require('@/assets/brand/mark.png');
const WORD = require('@/assets/brand/wordmark.png');

const MARK_SIZE = 92;
const WORD_H = 34;
const WORD_W = Math.round(WORD_H * (1024 / 255));  // ratio du fichier
const GAP = 12;
// Decalage a appliquer pour que la marque soit exactement au centre avant
// que le mot n'existe.
const SHIFT = (WORD_W + GAP) / 2;

/**
 * Fin de chaque lettre de « UnSwipe », en fraction de la largeur du mot.
 * Mesurees dans le fichier : les colonnes vides separent U, n, p et e ; S,
 * w et i se touchent, leurs bornes sont posees sur leurs largeurs reelles.
 */
const LETTERS = [0.164, 0.311, 0.455, 0.626, 0.705, 0.863, 1];
const KEY = 62;    // la lettre entre
const HOLD = 68;   // le temps entre deux frappes

const T = {
  hold: 220,
  fade: 700,
  settle: 360,
  slide: 560,
  linger: 360,
  out: 400,
  black: 320,
};
const T_SLIDE = T.hold + T.fade + T.settle;
const T_WRITE = T_SLIDE + T.slide * 0.4;
const WRITE = LETTERS.length * (KEY + HOLD);
const T_OUT = T_WRITE + WRITE + T.linger;
const T_BLACK = T_OUT + T.out;
const T_END = T_BLACK + T.black;

/**
 * Le noir, la marque qui nait au centre, la marque qui glisse a gauche
 * pendant que « UnSwipe » se tape lettre par lettre, puis le fondu qui
 * ouvre sur le premier ecran.
 *
 * Les lettres sont celles du logo, pas une police qui l'imite : le masque
 * avance d'une borne de lettre a la suivante, avec un curseur qui le suit.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const born = useSharedValue(0);
  const slide = useSharedValue(1);
  const write = useSharedValue(0);
  const caret = useSharedValue(0);
  const out = useSharedValue(0);
  const black = useSharedValue(0);

  useEffect(() => {
    const E = Easing.bezier(0.16, 1, 0.3, 1);

    born.value = withDelay(T.hold, withTiming(1, { duration: T.fade, easing: E }));
    slide.value = withDelay(T_SLIDE, withTiming(0, { duration: T.slide, easing: E }));

    // Une frappe par lettre : elle entre vite, puis on attend la suivante.
    const keys = LETTERS.flatMap((stop) => [
      withTiming(stop, { duration: KEY, easing: Easing.out(Easing.quad) }),
      withTiming(stop, { duration: HOLD }),
    ]);
    write.value = withDelay(T_WRITE, withSequence(...keys));

    caret.value = withDelay(T_WRITE, withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(1, { duration: WRITE }),
      withTiming(0, { duration: 260 })
    ));

    out.value = withDelay(T_OUT, withTiming(1, { duration: T.out, easing: Easing.in(Easing.quad) }));
    black.value = withDelay(T_BLACK, withTiming(1, { duration: T.black, easing: Easing.linear }));

    const taps = LETTERS.map((_, i) =>
      setTimeout(() => haptics.tick(), T_WRITE + i * (KEY + HOLD))
    );
    const h1 = setTimeout(() => haptics.tap(), T.hold + T.fade * 0.7);
    const end = setTimeout(onDone, T_END);
    return () => { taps.forEach(clearTimeout); clearTimeout(h1); clearTimeout(end); };
  }, [born, slide, write, caret, out, black, onDone]);

  const veil = useAnimatedStyle(() => ({ opacity: 1 - black.value }));
  const stage = useAnimatedStyle(() => ({
    opacity: 1 - out.value,
    transform: [{ translateX: slide.value * SHIFT }],
  }));
  const mark = useAnimatedStyle(() => ({
    opacity: born.value,
    transform: [{ scale: 0.86 + born.value * 0.14 }],
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
        <Animated.View style={mark}>
          <Image source={MARK} style={styles.mark} contentFit="contain" />
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
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  word: { width: WORD_W, height: WORD_H, marginLeft: GAP },
  mask: { height: WORD_H, overflow: 'hidden' },
  // Largeur fixe a l'interieur du masque : c'est le masque qui bouge.
  letters: { width: WORD_W, height: WORD_H },
  caret: {
    position: 'absolute', left: 0, top: 4, bottom: 4, width: 2.5,
    borderRadius: 2, backgroundColor: colors.accent,
  },
});
