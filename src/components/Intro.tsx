import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming,
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

const T = {
  hold: 220,          // noir pur : rien ne bouge
  fade: 700,          // la marque arrive
  settle: 380,        // temps de pose avant le glissement
  slide: 560,         // la marque glisse a gauche
  write: 780,         // le mot s'ecrit
  linger: 300,        // on laisse lire
  out: 400,           // fondu du contenu
  black: 320,         // fondu du noir vers le premier ecran
};
const T_SLIDE = T.hold + T.fade + T.settle;
const T_WRITE = T_SLIDE + T.slide * 0.45;
const T_OUT = T_WRITE + T.write + T.linger;
const T_BLACK = T_OUT + T.out;
const T_END = T_BLACK + T.black;

/**
 * Quatre temps : le noir, la marque qui nait au centre, la marque qui
 * glisse a gauche pendant que le mot s'ecrit, puis le fondu qui ouvre sur
 * le premier ecran. Le mot est le vrai lettrage du logo, devoile de la
 * gauche vers la droite — pas une police qui l'imite.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const born = useSharedValue(0);    // 0 -> 1 : la marque apparait
  const slide = useSharedValue(1);   // 1 : centree ; 0 : en place dans le lockup
  const write = useSharedValue(0);   // largeur devoilee du mot
  const out = useSharedValue(0);     // fondu du contenu
  const black = useSharedValue(0);   // fondu du voile noir

  useEffect(() => {
    const E = Easing.bezier(0.16, 1, 0.3, 1);

    born.value = withDelay(T.hold, withTiming(1, { duration: T.fade, easing: E }));
    slide.value = withDelay(T_SLIDE, withTiming(0, { duration: T.slide, easing: E }));
    // Lineaire : une ecriture a vitesse constante, comme une main.
    write.value = withDelay(T_WRITE, withTiming(1, { duration: T.write, easing: Easing.linear }));
    out.value = withDelay(T_OUT, withTiming(1, { duration: T.out, easing: Easing.in(Easing.quad) }));
    black.value = withDelay(T_BLACK, withTiming(1, { duration: T.black, easing: Easing.linear }));

    const h1 = setTimeout(() => haptics.tap(), T.hold + T.fade * 0.7);
    const h2 = setTimeout(() => haptics.success(), T_WRITE + T.write);
    const end = setTimeout(onDone, T_END);
    return () => { clearTimeout(h1); clearTimeout(h2); clearTimeout(end); };
  }, [born, slide, write, out, black, onDone]);

  const veil = useAnimatedStyle(() => ({ opacity: 1 - black.value }));
  const stage = useAnimatedStyle(() => ({
    opacity: 1 - out.value,
    transform: [{ translateX: slide.value * SHIFT }],
  }));
  const mark = useAnimatedStyle(() => ({
    opacity: born.value,
    transform: [{ scale: 0.86 + born.value * 0.14 }],
  }));
  // Le mot se decouvre par la largeur du masque : les lettres ne sont
  // jamais etirees, elles apparaissent.
  const mask = useAnimatedStyle(() => ({ width: write.value * WORD_W }));

  return (
    <Animated.View style={[styles.root, veil]} pointerEvents="none">
      <Animated.View style={[styles.stage, stage]}>
        <Animated.View style={mark}>
          <Image source={MARK} style={styles.mark} contentFit="contain" />
        </Animated.View>

        <Animated.View style={[styles.mask, mask]}>
          <Image source={WORD} style={styles.word} contentFit="contain" />
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
  mask: { height: WORD_H, marginLeft: GAP, overflow: 'hidden' },
  // Largeur fixe a l'interieur du masque : c'est le masque qui bouge.
  word: { width: WORD_W, height: WORD_H },
});
