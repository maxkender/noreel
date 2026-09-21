import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, textAlpha, withAlpha } from '@/theme/colors';
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
            { backgroundColor: withAlpha(disabled ? colors.mist : colors.sun, 0.14) },
          ]}
          pointerEvents="none"
        />
        <Text
          variant="button"
          color={withAlpha(colors.mist, disabled ? textAlpha.tertiary : 1)}
        >
          {label}
        </Text>
      </Glass>
    </APressable>
  );
}

const styles = StyleSheet.create({
  shell: { height: 56, alignItems: 'center', justifyContent: 'center' },
});
