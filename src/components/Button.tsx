import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from './type/Text';

const A = Animated.createAnimatedComponent(Pressable);

/**
 * Verre sombre, filet clair, et une ombre coloree diffuse — pas de barre
 * dessinee : la version precedente posait un rectangle vert sous la pilule,
 * qui se voyait comme une ligne.
 */
export function Button({
  label, onPress, disabled, variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (variant === 'ghost') {
    return (
      <Pressable onPress={onPress} style={styles.ghost} hitSlop={10}>
        <Text variant="body" color={withAlpha(colors.mist, 0.45)}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.wrap, !disabled && styles.lift]}>
      <A
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(0.975, springs.snappy); haptics.press(); }}
        onPressOut={() => { scale.value = withSpring(1, springs.snappy); }}
        onPress={onPress}
        style={[styles.pill, anim, disabled && styles.off]}
      >
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[styles.tint, disabled && styles.tintOff]} />
        <Text
          variant="button"
          color={disabled ? withAlpha(colors.mist, 0.3) : colors.mist}
          style={styles.label}
        >
          {label}
        </Text>
      </A>
    </View>
  );
}

const H = 58;
const styles = StyleSheet.create({
  wrap: { height: H, borderRadius: H / 2 },
  // L'ombre coloree remplace la barre : elle deborde sans jamais dessiner de ligne.
  lift: {
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  pill: {
    height: H, borderRadius: H / 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.35),
  },
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.mist, 0.12),
  },
  tintOff: { backgroundColor: withAlpha(colors.mist, 0.04) },
  label: { textAlign: 'center' },
  off: { borderColor: withAlpha(colors.mist, 0.12) },
  ghost: { alignSelf: 'center', paddingVertical: 14 },
});
