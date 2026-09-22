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
 * Verre epais : flou, teinte violette, reflet haut, liseré bas, et une ombre
 * coloree qui deborde. Le libelle ne peut plus etre coupe — il se reduit
 * plutot que de deborder.
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
        onPressIn={() => { scale.value = withSpring(0.97, springs.snappy); haptics.press(); }}
        onPressOut={() => { scale.value = withSpring(1, springs.snappy); }}
        onPress={onPress}
        style={[styles.pill, anim, disabled && styles.off]}
      >
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />

        {/* Teinte violette diagonale : c'est elle qui fait le verre colore. */}
        <LinearGradient
          colors={disabled
            ? [withAlpha(colors.mist, 0.05), withAlpha(colors.mist, 0.02)]
            : [withAlpha(colors.accent, 0.38), withAlpha(colors.accentDeep, 0.3), withAlpha(colors.accentWarm, 0.22)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Reflet : une lueur d'1,5 pt en haut, comme sur une vitre. */}
        <LinearGradient
          colors={['transparent', withAlpha(colors.mist, 0.75), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sheen}
          pointerEvents="none"
        />

        <Text
          variant="button"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
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
    shadowColor: colors.accentDeep,
    shadowOpacity: 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  pill: {
    height: H, borderRadius: H / 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    // Le libelle respire : sans ces marges il touchait le bord arrondi.
    paddingHorizontal: 26,
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.4),
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  label: { textAlign: 'center', width: '100%' },
  off: { borderColor: withAlpha(colors.mist, 0.12) },
  ghost: { alignSelf: 'center', paddingVertical: 14 },
});
