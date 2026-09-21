import { Pressable, StyleSheet } from 'react-native';
import { colors, withAlpha } from '@/theme/colors';
import { radii } from '@/theme/spacing';
import { haptics } from '@/lib/haptics';
import { Text } from './type/Text';

/** Un vrai bouton plein. Pas de verre, pas de flou : lisible, evident. */
export function Button({
  label, onPress, disabled, variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const ghost = variant === 'ghost';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => { haptics.press(); onPress(); }}
      style={({ pressed }) => [
        styles.base,
        ghost ? styles.ghost : styles.primary,
        disabled && styles.disabled,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text
        variant="button"
        color={ghost ? withAlpha(colors.mist, 0.7) : '#0B0D1F'}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 54, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.sun },
  ghost: { backgroundColor: 'transparent' },
  disabled: { backgroundColor: withAlpha(colors.mist, 0.12) },
});
