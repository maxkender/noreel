import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from './type/Text';

const A = Animated.createAnimatedComponent(Pressable);

/**
 * Reponse de QCM. Trois choses bougent au doigt et aucune ne deplace quoi
 * que ce soit : l'echelle sous la pression, la teinte du verre, et la
 * pastille qui se remplit. La hauteur, elle, ne change jamais.
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
    borderColor: interpolateColor(
      on.value,
      [0, 1],
      [withAlpha(colors.mist, 0.12), withAlpha(colors.accent, 0.62)]
    ),
  }));

  const tint = useAnimatedStyle(() => ({ opacity: on.value }));

  const dot = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      on.value, [0, 1], ['#00000000', colors.accent]
    ),
    borderColor: interpolateColor(
      on.value, [0, 1], [withAlpha(colors.mist, 0.28), colors.accent]
    ),
    transform: [{ scale: 1 + on.value * 0.06 }],
  }));

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
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={st.base} />
      {/* La teinte d'accent monte en fondu : pas de saut de couleur. */}
      <Animated.View style={[StyleSheet.absoluteFill, tint]}>
        <LinearGradient
          colors={[withAlpha(colors.accent, 0.2), withAlpha(colors.accentWarm, 0.1)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {lead ? <View style={st.lead}>{lead}</View> : null}

      <View style={st.text}>
        <Text variant="body">{label}</Text>
        {sub ? <Text variant="label" tone="tertiary">{sub}</Text> : null}
      </View>

      <Animated.View style={[st.dot, shape === 'check' && st.box, dot]}>
        <Animated.View style={tick}>
          <Check size={13} strokeWidth={3.2} color={colors.night} />
        </Animated.View>
      </Animated.View>
    </A>
  );
}

const st = StyleSheet.create({
  shell: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: 17,
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
  },
  base: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.mist, 0.05),
  },
  lead: { minWidth: 30, alignItems: 'center' },
  text: { flex: 1, gap: 1 },
  dot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  box: { borderRadius: 8 },
});
