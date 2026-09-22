import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from './type/Text';

const A = Animated.createAnimatedComponent(Pressable);

/**
 * Reponse de QCM.
 *
 * Tout ce qui bouge est une opacite ou une echelle — aucune couleur n'est
 * interpolee et aucun flou n'est empile. Les etats selectionnes sont des
 * calques poses par-dessus qu'on allume : c'est plus leger a l'image, et ca
 * evite d'animer bordure et fond, les deux proprietes les plus fragiles.
 * La hauteur, elle, ne change jamais : la liste ne saute pas.
 */
export function SelectCard({
  label, sub, lead, selected, onPress, shape = 'radio',
}: {
  label: string;
  sub?: string;
  /** Emoji, icone ou logo pose a gauche. */
  lead?: ReactNode;
  selected: boolean;
  onPress: () => void;
  shape?: 'radio' | 'check';
}) {
  const on = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    on.value = withSpring(selected ? 1 : 0, springs.snappy);
  }, [selected, on]);

  const shell = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.025 }],
  }));
  const lit = useAnimatedStyle(() => ({ opacity: on.value }));
  const lift = useAnimatedStyle(() => ({ transform: [{ scale: 1 + on.value * 0.12 }] }));
  const tick = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scale: 0.5 + on.value * 0.5 }],
  }));

  return (
    <A
      accessibilityRole={shape === 'check' ? 'checkbox' : 'radio'}
      accessibilityState={shape === 'check' ? { checked: selected } : { selected }}
      onPressIn={() => { press.value = withTiming(1, { duration: 90 }); }}
      onPressOut={() => { press.value = withSpring(0, springs.snappy); }}
      onPress={() => { haptics.tick(); onPress(); }}
      style={[st.shell, shell]}
    >
      <View style={st.base} />
      {/* Reflet haut : l'epaisseur du verre, sans flou a calculer. */}
      <LinearGradient
        colors={[withAlpha(colors.mist, 0.1), 'transparent']}
        style={st.sheen}
        pointerEvents="none"
      />

      {/* Les deux calques d'etat : teinte puis liseré, allumes ensemble. */}
      <Animated.View style={[StyleSheet.absoluteFill, lit]} pointerEvents="none">
        <LinearGradient
          colors={[withAlpha(colors.accent, 0.22), withAlpha(colors.accentWarm, 0.1)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[st.ring, lit]} pointerEvents="none" />

      {lead ? <Animated.View style={[st.lead, lift]}>{lead}</Animated.View> : null}

      <View style={st.text}>
        <Text variant="body">{label}</Text>
        {sub ? <Text variant="label" tone="tertiary">{sub}</Text> : null}
      </View>

      <View style={[st.dot, shape === 'check' && st.box]}>
        <Animated.View style={[StyleSheet.absoluteFill, st.fill, lit]} />
        <Animated.View style={tick}>
          <Check size={13} strokeWidth={3.2} color={colors.night} />
        </Animated.View>
      </View>
    </A>
  );
}

const st = StyleSheet.create({
  shell: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: 17,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.12),
  },
  base: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.mist, 0.06),
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 22 },
  ring: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20, borderWidth: 1.5, borderColor: withAlpha(colors.accent, 0.65),
  },
  lead: { minWidth: 30, alignItems: 'center' },
  text: { flex: 1, gap: 1 },
  dot: {
    width: 24, height: 24, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1.5, borderColor: withAlpha(colors.mist, 0.28),
    alignItems: 'center', justifyContent: 'center',
  },
  box: { borderRadius: 8 },
  fill: { backgroundColor: colors.accent },
});
