import { useEffect, useMemo, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

/**
 * Une icone dans un anneau qui respire.
 *
 * La plupart des ecrans du parcours n'avaient qu'un titre et un bouton :
 * lisibles, mais tous pareils — on ne savait plus sur quel ecran on etait,
 * ni ce qu'il demandait, avant d'avoir lu. Une icone le dit d'un coup d'oeil,
 * et l'anneau qui bat lentement donne a la page un pouls avant que le texte
 * ait fini de s'ecrire. C'est un signe, pas une illustration : petit, en
 * haut, et il ne bouge jamais assez pour qu'on le regarde a la place du
 * texte.
 */
export function Emblem({
  icon: Icon, tone, size = 64, style,
}: {
  icon: ComponentType<IconProps>;
  tone?: string;
  size?: number;
  style?: object;
}) {
  const c = useColors();
  const colour = tone ?? c.accent;
  const st = useMemo(() => sheet(size), [size]);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, false
    );
  }, [pulse]);

  // Le halo part de l'anneau, s'elargit et s'efface : un battement, lent.
  const halo = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.45 }],
  }));

  return (
    <View style={[st.root, style]} pointerEvents="none">
      <Animated.View style={[st.halo, halo, { borderColor: colour }]} />
      <View style={[st.ring, { borderColor: withAlpha(colour, 0.35) }]}>
        <LinearGradient
          colors={[withAlpha(colour, 0.32), withAlpha(colour, 0.08)]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Icon size={size * 0.42} strokeWidth={2.2} color={colour} />
      </View>
    </View>
  );
}

const sheet = (size: number) => StyleSheet.create({
  root: { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5,
  },
  ring: {
    width: size, height: size, borderRadius: size / 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
});
