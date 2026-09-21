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
 * La lueur est DERRIERE le bouton, floue et debordante — pas une bande dessinee
 * a l'interieur. C'est ce qui fait la difference avec un bouton plat.
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
    <View style={styles.wrap}>
      {!disabled && (
        <>
          {/* Halo diffus sous le bouton : deux couches, l'une large, l'une serree. */}
          <LinearGradient
            colors={[withAlpha(colors.accent, 0.5), withAlpha('#6E8BFF', 0.35), 'transparent']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.haloWide}
            pointerEvents="none"
          />
          <View style={styles.haloTight} pointerEvents="none" />
        </>
      )}

      <A
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(0.975, springs.snappy); haptics.press(); }}
        onPressOut={() => { scale.value = withSpring(1, springs.snappy); }}
        onPress={onPress}
        style={[styles.pill, anim, disabled && styles.off]}
      >
        <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />
        <Text
          variant="button"
          color={disabled ? withAlpha(colors.mist, 0.28) : colors.mist}
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
  wrap: { height: H },
  haloWide: {
    position: 'absolute', left: 14, right: 14, bottom: -6, height: H,
    borderRadius: H / 2, opacity: 0.55,
  },
  haloTight: {
    position: 'absolute', left: 40, right: 40, bottom: 2, height: 16,
    borderRadius: 8, backgroundColor: withAlpha(colors.accent, 0.5),
    shadowColor: colors.accent, shadowOpacity: 0.9, shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  pill: {
    height: H, borderRadius: H / 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.28),
  },
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.mist, 0.09),
  },
  label: { textAlign: 'center' },
  off: { borderColor: withAlpha(colors.mist, 0.1) },
  ghost: { alignSelf: 'center', paddingVertical: 14 },
});
