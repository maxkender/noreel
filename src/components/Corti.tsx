import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { useReducedMotion } from '@/lib/useReducedMotion';

/*
 * Corti, la mascotte : un petit cerveau qui s'eteint quand on scrolle et se
 * rallume a chaque jour sans reels.
 *
 * Le dossier livre par le studio contient un CortiView.swift : il ne sert
 * pas ici, l'app est en React Native. Ce qui sert, ce sont les quatre images
 * et la regle de niveau, qui sont reprises telles quelles pour que la
 * mascotte se comporte partout de la meme facon.
 *
 * Rien de ce qui bouge ici n'est une COULEUR : cette app tombe des qu'on
 * anime une propriete de couleur. La respiration est une echelle, la lueur
 * une opacite.
 */

export type CortiLevel = 0 | 1 | 2 | 3;

const ART: Record<CortiLevel, ReturnType<typeof require>> = {
  0: require('@/assets/corti/corti-0.png'),
  1: require('@/assets/corti/corti-1.png'),
  2: require('@/assets/corti/corti-2.png'),
  3: require('@/assets/corti/corti-3.png'),
};

export const CORTI_ICON = require('@/assets/corti/corti-icon.png');

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

/** Ce que Corti dit de son etat, selon son niveau. */
export function cortiLine(level: CortiLevel, days: number): string {
  if (level === 0) return 'Il a vu trop de Reels. Il ne sait plus pourquoi.';
  if (level === 1) return `${days} jour${days > 1 ? 's' : ''} sans Reels. Il respire.`;
  if (level === 2) return `${days} jours sans Reels. Ça se voit, non ?`;
  return `${days} jours. Il n’a jamais autant brillé.`;
}

/**
 * Corti, dessine.
 *
 * Toujours dans un carre : l'etirer la deforme, et une mascotte deformee
 * cesse d'etre attachante. La taille est donc une seule valeur.
 */
export function Corti({
  level, size = 132, animated = true, style,
}: {
  level: CortiLevel;
  size?: number;
  /** Faux pour une capture ou une vignette : l'image doit etre immobile. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const reduced = useReducedMotion();
  const breath = useSharedValue(0);
  const halo = useSharedValue(0);

  const alive = animated && !reduced;

  useEffect(() => {
    if (!alive) {
      breath.value = 0;
      halo.value = 0;
      return;
    }
    // Une respiration lente, jamais synchrone avec la lueur : deux cycles de
    // meme duree donnent un clignotement, deux cycles decales donnent un
    // etre vivant.
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    halo.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [alive, breath, halo]);

  // Eteint, Corti ne respire presque plus : l'amplitude porte l'etat autant
  // que le dessin.
  const depth = level === 0 ? 0.008 : 0.012 + level * 0.006;

  const body = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * depth }],
  }));
  const glow = useAnimatedStyle(() => ({
    opacity: level === 0 ? 0 : (0.18 + level * 0.1) * (0.55 + halo.value * 0.45),
    transform: [{ scale: 1 + halo.value * 0.06 }],
  }));

  return (
    <View
      style={[{ width: size, height: size }, st.root, style]}
      accessibilityRole="image"
      accessibilityLabel={
        level === 0 ? 'Corti, éteint' : `Corti, niveau ${level} sur 3`
      }
    >
      {/* La lueur est derriere, et elle n'existe pas au niveau zero. */}
      <Animated.View
        style={[st.glow, { borderRadius: size / 2 }, glow]}
        pointerEvents="none"
      />
      <Animated.View style={[st.art, body]}>
        <Image
          source={ART[level]}
          style={{ width: size, height: size }}
          contentFit="contain"
          transition={260}
        />
      </Animated.View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
    backgroundColor: withAlpha(c.accent, 0.55),
  },
  art: { alignItems: 'center', justifyContent: 'center' },
});
