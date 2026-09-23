import { useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { radii } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';
import { Glass } from './Glass';

const APressable = Animated.createAnimatedComponent(Pressable);

export function GlassButton({
  label,
  onPress,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <APressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, springs.snappy);
        haptics.press();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springs.snappy);
      }}
      onPress={onPress}
      style={[animated, style]}
    >
      <Glass radius={radii.pill} warmEdge="bottom" blur={false} style={styles.shell}>
        {/* Teinte du CTA : sun 14 %, neutre quand désactivé (jamais d'opacity). */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: withAlpha(disabled ? c.mist : c.sun, 0.14) },
          ]}
          pointerEvents="none"
        />
        <Text
          variant="button"
          color={withAlpha(c.mist, disabled ? c.textTertiary : 1)}
        >
          {label}
        </Text>
      </Glass>
    </APressable>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  shell: { height: 56, alignItems: 'center', justifyContent: 'center' },
});
