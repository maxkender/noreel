import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from './type/Text';

const A = Animated.createAnimatedComponent(Pressable);

/**
 * Une pilule PLEINE, claire sur fond noir, comme chez Opal : pas de verre,
 * pas de degrade, pas d'ombre coloree. Le libelle ne peut pas etre coupe —
 * il se reduit plutot que de deborder.
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
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (variant === 'ghost') {
    return (
      <Pressable onPress={onPress} style={styles.ghost} hitSlop={10}>
        <Text variant="body" color={withAlpha(c.mist, 0.45)}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.wrap, !disabled && styles.lift]}>
      <A
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(0.97, springs.snappy); haptics.press(); }}
        onPressOut={() => { scale.value = withSpring(1, springs.snappy); }}
        onPress={onPress}
        style={[styles.pill, anim, disabled && styles.off]}
      >
        <Text
          variant="button"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          color={disabled ? withAlpha(c.mist, 0.35) : c.night}
          style={styles.label}
        >
          {label}
        </Text>
      </A>
    </View>
  );
}

const H = 56;
const sheet = (c: Palette) => StyleSheet.create({
  wrap: { height: H, borderRadius: H / 2 },
  lift: {},
  pill: {
    height: H, borderRadius: H / 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 26,
    backgroundColor: c.mist,
  },
  label: { textAlign: 'center', width: '100%' },
  off: { backgroundColor: withAlpha(c.mist, 0.1) },
  ghost: { alignSelf: 'center', paddingVertical: 14 },
});
