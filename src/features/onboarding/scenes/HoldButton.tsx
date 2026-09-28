import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';

/** Deux secondes : assez pour que ce soit un choix, pas assez pour lasser. */
export const HOLD_MS = 2000;

/**
 * Un bouton qu'on MAINTIENT.
 *
 * Un tap se donne sans y penser — c'est meme le geste que l'app combat. Le
 * seul ecran ou l'on demande un engagement ne peut pas se passer avec le
 * geste qui vaut zero. Deux secondes de pression, la pilule qui se remplit
 * sous le doigt, et un relacher trop tot qui la vide : on prouve qu'on veut,
 * un peu comme on tient une porte.
 *
 * Le remplissage vit sur le fil d'animation ; la fin remonte au JS une seule
 * fois, quand la barre touche le bord.
 */
export function HoldButton({
  label, holdingLabel, onComplete,
}: {
  label: string;
  holdingLabel: string;
  onComplete: () => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const fill = useSharedValue(0);
  const [holding, setHolding] = useState(false);
  const fired = useRef(false);

  const done = () => {
    if (fired.current) return;
    fired.current = true;
    haptics.success();
    onComplete();
  };

  const start = () => {
    setHolding(true);
    haptics.press();
    fill.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(done)();
    });
  };
  const stop = () => {
    setHolding(false);
    if (fired.current) return;
    cancelAnimation(fill);
    // Elle se vide plus vite qu'elle ne s'est remplie : le relacher est une
    // reponse, pas une attente.
    fill.value = withTiming(0, { duration: 260 });
  };

  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={st.wrap}>
      <Pressable
        onPressIn={start}
        onPressOut={stop}
        accessibilityRole="button"
        accessibilityHint={holdingLabel}
        style={st.pill}
      >
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[withAlpha(c.accent, 0.3), withAlpha(c.accentDeep, 0.24), withAlpha(c.accentWarm, 0.18)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Le remplissage, de gauche a droite, sous le libelle. */}
        <Animated.View style={[st.fill, bar]} pointerEvents="none">
          <LinearGradient
            colors={[c.accent, c.accentWarm]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Text variant="button" color={c.mist} style={st.label}>
          {holding ? holdingLabel : label}
        </Text>
      </Pressable>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  wrap: {
    borderRadius: 30, shadowColor: c.accent, shadowOpacity: 0.35,
    shadowRadius: 22, shadowOffset: { width: 0, height: 10 },
  },
  pill: {
    height: 58, borderRadius: 29, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.22),
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  label: { zIndex: 1 },
});
