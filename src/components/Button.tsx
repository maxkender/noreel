import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from './type/Text';

const A = Animated.createAnimatedComponent(Pressable);

/**
 * Pilule de verre pleine largeur, 60 pt, avec une lueur qui deborde par le bas.
 * Le texte est centre par le conteneur, pas par une marge : il ne peut pas deriver.
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
      <Pressable onPress={onPress} style={styles.ghost} hitSlop={8}>
        <Text variant="body" color={withAlpha(colors.mist, 0.5)}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <A
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.97, springs.snappy); haptics.press(); }}
      onPressOut={() => { scale.value = withSpring(1, springs.snappy); }}
      onPress={onPress}
      style={[styles.shell, anim, disabled && styles.off]}
    >
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.fill} />

      {/* La lueur sous le bouton : signature Opal, elle "pose" le bouton. */}
      {!disabled && (
        <LinearGradient
          colors={['transparent', withAlpha(colors.accent, 0.5)]}
          style={styles.glow}
          pointerEvents="none"
        />
      )}

      <Text
        variant="button"
        color={disabled ? withAlpha(colors.mist, 0.3) : colors.mist}
        style={styles.label}
      >
        {label}
      </Text>
    </A>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.mist, 0.22),
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: withAlpha(colors.mist, 0.07) },
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 22, opacity: 0.55 },
  label: { textAlign: 'center' },
  off: { borderColor: withAlpha(colors.mist, 0.1) },
  ghost: { alignSelf: 'center', paddingVertical: 14 },
});
