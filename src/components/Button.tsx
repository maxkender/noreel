import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from './type/Text';

const A = Animated.createAnimatedComponent(Pressable);

/** Blanc plein sur noir. L'enfoncement est un ressort, pas une opacite. */
export function Button({
  label, onPress, disabled, variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const fg =
    variant === 'primary' ? colors.night
    : variant === 'secondary' ? colors.mist
    : withAlpha(colors.mist, 0.55);

  return (
    <A
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.975, springs.snappy); haptics.press(); }}
      onPressOut={() => { scale.value = withSpring(1, springs.snappy); }}
      onPress={onPress}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        anim,
      ]}
    >
      <Text variant="button" color={disabled ? withAlpha(colors.mist, 0.3) : fg}>
        {label}
      </Text>
    </A>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.mist },
  secondary: {
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  ghost: { backgroundColor: 'transparent' },
  disabled: { backgroundColor: colors.surface },
});
